require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const app = express();
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const BASE_USER_URI = "https://account-d.docusign.com/oauth/userinfo"
const BASE_API_URI = "https://demo.docusign.net"

const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    if (req.cookies.access_token && req.cookies.acc) {
        res.json(
            {
                message: "Hello There 😀",
                endpoints: {
                    "/templates[GET]": "Fetch all the templates",
                    "/createEnvelope[POST]" : {
                        Description : "Creates Envelopes from Template",
                        "Parameters to be sent in json format" : {
                            templateId : "Template to be used",
                            status : "Set it to 'sent' to send the envelope or set it to 'created' to save as draft."
                        }
                    }
                }
            })

    } else {
        console.log('redirect');
        res.redirect(`https://account-d.docusign.com/oauth/auth?response_type=code&scope=impersonation%20signature&client_id=${process.env.INTEGRATION_KEY}&redirect_uri=http://localhost:3000/callback`);
    }
});

app.get('/templates', async (req, res) => {
    if (req.cookies.access_token && req.cookies.acc) {
        try {
            const response = await axios.get(`${BASE_API_URI}/restapi/v2.1/accounts/${req.cookies.acc}/templates/`,
                {
                    headers: {
                        Authorization: `Bearer ${req.cookies.access_token}`
                    }
                }
            )
            res.json(response.data)
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "There might be an error!" })
        }

    } else {
        res.status(401).json({ message: "Unauthorized" })
    }
})

app.post('/createEnvelope', async (req, res) => {
    console.log('cookies : ', req.cookies);
    try {
        if (req.cookies.access_token && req.cookies.acc) {
            const rest = await axios.get(`${BASE_API_URI}/restapi/v2.1/accounts/${req.cookies.acc}/templates/${req.body.templateId}`, {
                headers: {
                    Authorization: `Bearer ${req.cookies.access_token}`
                }
            })
            if (rest.status === 200) {
                const response = await axios.post(`${BASE_API_URI}/restapi/v2.1/accounts/${req.cookies.acc}/envelopes/`, { templateId: req.body.templateId, status: req.body.status }, {
                    headers: {
                        Authorization: `Bearer ${req.cookies.access_token}`
                    }
                })
                res.json(response.data)
            } else {
                res.json({ message: "Invalid Template ID" })
            }
        } else {
            res.status(401).json({ message: "Unauthorized" });
        }
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "An error Occured" });
    }
});

app.get('/callback', async (req, res) => {
    try {

        const resp = await axios.post(`https://account-d.docusign.com/oauth/token`,
            {
                grant_type: "authorization_code",
                code: req.query.code
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${process.env.INTEGRATION_KEY}:${process.env.SECRET_KEY}`).toString('base64')}`
                }
            }
        );
        const response = await axios.get(BASE_USER_URI,
            {
                headers: {
                    Authorization: `Bearer ${resp.data.access_token}`
                }
            }
        )
        res.cookie('access_token', resp.data.access_token, { maxAge: 1000 * 60 * 60 * 24, secure: true, sameSite: 'none', httpOnly: true })
        res.cookie('name', response.data.name, { httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 * 24, sameSite: 'none' })
        res.cookie('acc', response.data.accounts[0].account_id, { httpOnly: true, secure: true, maxAge: 1000 * 60 * 60 * 24, sameSite: 'none' })
        res.redirect('/');
    } catch (error) {
        console.log(error)
        res.json({ message: "An error Occured" });
    }

});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});