import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import qs from "qs"
import twilio from "twilio";
import fs from "fs"
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

// app.post('/send_sms', async (req, res) => {
//   try {
//     const response = await axios.post(
//       'https://cliq.zoho.in/api/v2/buddies/dharm_v@gkexport.com/message',
//       {
//         text: "hello dharm bhai aap free ho abhi"
//       },
//       {
//         headers: {
//           Authorization: 'Bearer 1000.3b22719686784657d87bff47a6f71e77.4ca5b5c51dbf90f8e647c091ade9b149',
//           'Content-Type': 'application/json',
//           // You can skip the cookies unless needed for session management
//           // Or use them only if required by the API
//         }
//       }
//     );

//     res.json({
//       message: 'Message sent successfully!',
//       data: response.data
//     });

//   } catch (error) {
//     console.error('Error sending message:', error.response?.data || error.message);
//     res.status(500).json({
//       message: 'Failed to send message',
//       error: error.response?.data || error.message
//     });
//   }
// });

// Download the helper library from https://www.twilio.com/docs/node/install

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure

// Client ID
// 1000.ZVKBEM29FTWQ28GY4YR8QXYODNT4NI

// Client Secret
// 5fcad4f500f46a07e10e3b6c4cd925556958b42e6e


app.post('/from-cliq', async (req, res) => {
  try {
    const check_receiver = req.body.user;
    const messageText = req.body.message;

    // Read user.json
    const find_user = JSON.parse(fs.readFileSync("user.json", { encoding: 'utf-8' }));

    // Find matching user data
    const matchedUser = find_user.find(ele => ele.user_id !== null && ele.user_id === check_receiver);

    if (!matchedUser) {
      return res.status(404).send('User not found');
    }

    // Prepare WhatsApp API call parameters
    const whatsappAccessToken = 'EAAI2Ossi3PIBOz75F5Qa5T6oYZCHvTFcZA1nspItiIH6LfDe5AhR9kblkpkzZAfzOVOVRCkV9q5gmXDKSXNP5KhzsySyF0ODZBvKYvkY6U8OMTYeZBKuqPI4J41cYxISdSXuDIWFM5AqgemnSf53nvjQLPuphl1V3c7Mmc4aZCa1fX73WUienykmD1ahJkypM5TFFKBlpuPWXLsKKyQEZBEZCsMgpdQEL8VQBKVM0ZB8ZD';  // Replace with your actual token
    const phoneNumberId = '578737805333309';          // From your Facebook WhatsApp Business account

    // Prepare payload for WhatsApp Cloud API (template message example)
    const payload = {
      messaging_product: "whatsapp",
      to: matchedUser.recipient_no, // e.g., "919876543210"
      type: "template",
      template: {
        name: "whatsapp_testing", // updated to match the template name from the image
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: messageText // replace 'apiMessage' with the actual variable or string containing your API message
              }
            ]
          }
        ]
      }
    };


    // Call WhatsApp Cloud API to send message
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

   if (mode === 'subscribe' && token === 'xfcgvhbjnkm,fopdociwqj') {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/to_cliq', async (req, res) => {
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const messages = changes?.value?.messages;

  if (!messages || messages.length === 0) {
    return res.sendStatus(200); // No message to process
  }

  const msg = messages[0];
  const text = msg.text?.body;
  const from = msg.from;

  try {
    const response = await axios.post(
      'https://cliq.zoho.in/api/v2/bots/test/message',
      {
        text: `WhatsApp message from ${from}: ${text}`,
        userids: "60039859115",
        sync_message: true
      },
      {
        headers: {
          'Authorization': 'Bearer 1000.b3720b82b45acab2ddc84477ba93735d.8064551b529c1e9cbe33086f362a41ff',
          'Content-Type': 'application/json'
        }
      }
    );

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


// xfcgvhbjnkm,fopdociwqj
