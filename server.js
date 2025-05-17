import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import qs from "qs"

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


    // const accountSid = process.env.TWILIO_ACCOUNT_SID;
    // const authToken = process.env.TWILIO_AUTH_TOKEN;
    // const client = twilio(accountSid, authToken);

    // async function createMessage() {
    //   const message = await client.messages.create({
    //     body: "Hello there!",
    //     from: "whatsapp:+14155238886", // <-- Twilio Sandbox number
    //     to: "whatsapp:+918169016586",  // <-- Your verified number
    //   });

    //   console.log(message.body);
    // }

    // createMessage();
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


app.post('/from-cliq', (req, res) => {

  console.log('Zoho User:', JSON.stringify(req.body, null, 2));

  // You can now respond or forward this to WhatsApp
  res.status(200).send('OK');
});

