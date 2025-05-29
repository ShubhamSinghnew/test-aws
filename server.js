import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import qs from "qs"
import twilio from "twilio";
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import contact_model from "./src/model/contact.js";
// Load environment variables from .env file
dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS
app.use(cors({ origin: true }))

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
// export default io;

const getZohoAccessToken = async () => {
  const tokenData = JSON.parse(fs.readFileSync("zoho_token.json", 'utf-8'));
  const now = Date.now();

  // Token still valid
  if (tokenData.expires_at > now) {
    return tokenData.access_token;
  }

  try {
    const params = new URLSearchParams();
    params.append('refresh_token', tokenData.refresh_token);
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
      params
    );

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // in seconds

    // Update token file
    const updatedToken = {
      ...tokenData,
      access_token: newAccessToken,
      expires_at: now + (expiresIn * 1000)
    };

    fs.writeFileSync('zoho_token.json', JSON.stringify(updatedToken, null, 2));

    return newAccessToken;
  } catch (error) {
    console.error('Failed to refresh Zoho token:', error.response?.data || error.message);
    throw new Error('Zoho token refresh failed');
  }
};

app.get('/auth/zoho/callback', async (req, res) => {
  const { code } = req.query;
  console.log('code: ', code)

  if (!code) {
    return res.status(400).send('Missing code');
  }

  try {
    const response = await axios.post(
      'https://accounts.zoho.in/oauth/v2/token',
      qs.stringify({
        code: code,
        client_id: '1000.ZVKBEM29FTWQ28GY4YR8QXYODNT4NI',
        client_secret: '5fcad4f500f46a07e10e3b6c4cd925556958b42e6e',
        redirect_uri: 'https://test-aws-lz6a.onrender.com/auth/zoho/callback',
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    console.log('Access Token:', response.data);

    res.send('Zoho authorization complete. Tokens received.');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).send('Token exchange failed');
  }
});


async function downloadFile(url, outputPath) {
  const response = await axios.get(url, {
    responseType: 'stream',
    headers: {
      Authorization: 'Ber', // or any valid header
    },
  });
  response.data.pipe(fs.createWriteStream(outputPath));
  return new Promise((resolve, reject) => {
    response.data.on('end', () => resolve(outputPath));
    response.data.on('error', reject);
  });
}


app.post('/from-cliq', async (req, res) => {
  try {
    const check_receiver = req.body.user;
    const messageText = req.body.message;

    // Read user.json
    const find_user = JSON.parse(fs.readFileSync("user.json", "utf-8"));
    const matchedUser = find_user.find(ele => ele.user_id && ele.user_id === check_receiver);

    if (!matchedUser) {
      return res.status(404).send('User not found');
    }

    const whatsappTokenData = JSON.parse(fs.readFileSync("whatsapp_token.json", "utf-8"));
    const now = Date.now();

    if (now > whatsappTokenData.expires_at) {
      return res.status(401).send("WhatsApp access token expired. Please update it.");
    }

    const whatsappAccessToken = whatsappTokenData.access_token;
    const phoneNumberId = '578737805333309';

    let template = "whatsapp_txt";  // Always use the image+text template
    const components = [];

    let languageCode = "en"; // default

    if (req.body && req.body?.file && req.body?.file?.file) {
      console.log("testing in the without comment if",req.body?.file?.file?.url)
      const imageUrl = req.body?.file?.file?.url;
      languageCode = "en_US";
      template = "whatsapes_test__from_rro"; // Template with image header + 1 body variable

      components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: imageUrl }
          }
        ]
      });

      components.push({
        type: "body",
        parameters: [
          {
            type: "text",
            text: "default_txt" // Required body variable — fallback to space if empty
          }
        ]
      });
    }

    if (req.body?.url) {
      const imageUrl = req.body.url;
      console.log("with comment ttttttttttttttttttttttt",imageUrl)
      languageCode = "en_US";
      const commentText = req.body?.file && req.body?.file !== ""
        ? req.body?.file
        : "default_txt";  // Use a space to satisfy the required variable

      template = "whatsapes_test__from_rro"; // Template with image header + 1 body variable

      components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: { link: imageUrl }
          }
        ]
      });

      components.push({
        type: "body",
        parameters: [
          {
            type: "text",
            text: commentText // Required body variable — fallback to space if empty
          }
        ]
      });

    } else if (messageText && messageText.length !== 0) {
      console.log("only text",messageText)
      languageCode = "en";
      template = "whatsapp_txt"; // Template with only body text
      components.push({
        type: "body",
        parameters: [
          {
            type: "text",
            text: messageText
          }
        ]
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      to: matchedUser.recipient_no,
      type: "template",
      template: {
        name: template,
        language: { code: languageCode },
        components
      }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp message sent:', response.data);
    res.status(200).send('Message forwarded to WhatsApp.');

  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    res.status(500).send('Failed to send message.');
  }
});

app.get('/to_cliq', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.verify_token) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.post('/to_cliq', async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const messages = changes?.value?.messages;

  if (!messages || messages.length === 0) {
    return res.sendStatus(200); // No message to process
  }

  const msg = messages[0];
  const type = msg?.type
  const from = msg.from;

  // Read user.json
  const find_user = JSON.parse(fs.readFileSync("user.json", { encoding: 'utf-8' }));

  // Find matching user data
  const matchedUser = find_user.find(ele => ele.recipient_no !== null && ele.recipient_no === from);

  if (!matchedUser) {
    return res.status(404).send('User not found');
  }

  try {
    const accessToken = await getZohoAccessToken();

    let response

    if (type === "text") {
      response = await axios.post(
        'https://cliq.zoho.in/api/v2/bots/test/message',
        {
          text: `WhatsApp message from ${from}: ${msg?.text?.body}`,
          userids: matchedUser.user_id,
          sync_message: true
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {

      const whatsappTokenData = JSON.parse(fs.readFileSync("whatsapp_token.json", "utf-8"));
      const now = Date.now();

      if (now > whatsappTokenData.expires_at) {
        return res.status(401).send("WhatsApp access token expired. Please update it.");
      }

      const whatsappAccessToken = whatsappTokenData.access_token;

      const mediaUrlResponse = await axios.get(`https://graph.facebook.com/v19.0/${msg?.image?.id}`, {
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`
        }
      });
      const mediaUrl = mediaUrlResponse.data.url;

      const imageRes = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`
        }
      });

      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(__dirname, 'public', 'images', filename);

      fs.mkdirSync(path.join(__dirname, 'public', 'images'), { recursive: true });

      fs.writeFileSync(filepath, imageRes.data);
      const publicImageUrl = `https://test-aws-lz6a.onrender.com/images/${filename}`;

      response = await axios.post(
        'https://cliq.zoho.in/api/v2/bots/test/message',
        {
          text: `WhatsApp image from ${from}: [Click to view image](${publicImageUrl}) ${msg?.image?.caption === undefined ? "" : msg?.image?.caption}`,
          userids: matchedUser.user_id,
          sync_message: true
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    res.status(200).json({
      message: 'Message sent to Zoho Cliq',
      data: response.data
    });
  } catch (error) {
    console.error('Error sending message to Zoho Cliq:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to send message',
      error: error.response?.data || error.message
    });
  }
});
