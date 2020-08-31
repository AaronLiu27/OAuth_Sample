const fs = require("fs")
const express = require("express")
const bodyParser = require("body-parser")
const jwt = require("jsonwebtoken")
const {
	randomString,
	containsAll,
	decodeAuthCredentials,
	timeout,
} = require("./utils")

const config = {
	port: 9001,
	privateKey: fs.readFileSync("assets/private_key.pem"),

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
}

const clients = {
	"my-client": {
		name: "Sample Client",
		clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
		scopes: ["permission:name", "permission:date_of_birth"],
	},
	"test-client": {
		name: "Test Client",
		clientSecret: "TestSecret",
		scopes: ["permission:name"],
	},
}

const users = {
	user1: "password1",
	john: "appleseed",
}

const requests = {}
const authorizationCodes = {}

let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/authorization-server")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/
app.get('/authorize', (req, res) => {
	const clientID = req.query.client_id
	const client = clients[clientID]
	if (!client) {
		res.status(401).send()
		return
	}
	//console.log(req.query.scope.split(' '))
	if (
		typeof req.query.scope !== "string" ||
		!containsAll(client.scopes, req.query.scope.split(' '))
	) {
		res.status(401).send("Error, invalid scopes")
		return
	}
	const requestId = randomString()
	requests[requestId] = req.query
	res.render("login", { client, scope: req.query.scope, requestId })
	//res.status(200).send()
})
app.post('/approve', (req,res)=>{
	const userName = req.body.userName
	const password = req.body.password
	if (!users[userName] || users[userName] !== password){
		res.status(401).send('password error')
		return
	}
	const requestId = req.body.requestId
	if (!requests[requestId]){
		res.status(401).send('not existed requestId')
		return
	}
	else {
		const clientRequest = requests[requestId]
		delete requests[requestId]

		//???
		const code = randomString()
		authorizationCodes[code] = {
			clientReq: clientRequest,
			userName
		}
		//生成redirect的地uri
		//example: http://www.example.com/go-here?code=rof5ijf&state=pc03ns9S
		const redirectUri = new URL(clientRequest.redirect_uri)
		redirectUri.searchParams.set('code',code)
		redirectUri.searchParams.append('state',clientRequest.state)
		
		res.redirect(redirectUri)

	}
})

app.post('/token',(req,res)=>{
	const authcredentials = req.headers.authorization
	if (!authcredentials){
		res.status(401).send('not authorized')
		return
	}
	//Verifying the authorization header
	const {clientId, clientSecret} = decodeAuthCredentials(authcredentials)
	const client_actual = clients[clientId]
	if (!client_actual || client_actual.clientSecret != clientSecret){
		res.status(401).send()
		return
	}
	//check if the authorization code exists
	const code = req.body.code
	if (!code || !authorizationCodes[code]){
		res.status(401).send()
		return
	}
	const obj = authorizationCodes[code]
	delete authorizationCodes[code]
	//15.issuing the access token
	//npm i jsonwebtoken
	const token = jwt.sign(
		{
			userName: obj.userName,
			scope: obj.clientReq.scope
		},
		config.privateKey,
		{
			algorithm:"RS256",
			expiresIn:300,
			issuer:"http://localhost:"
		}
	)
	res.json({
		access_token: token,
		token_type: "Bearer",
		scope: obj.clientReq.scope,
	})

})



//

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes

module.exports = { app, requests, authorizationCodes, server }
