const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios").default
const { randomString, timeout } = require("./utils")
const url = require('url')

const config = {
	port: 9000,

	clientId: "my-client",
	clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
	redirectUri: "http://localhost:9000/callback",

	authorizationEndpoint: "http://localhost:9001/authorize",
	tokenEndpoint: "http://localhost:9001/token",
	userInfoEndpoint: "http://localhost:9002/user-info",
}
let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/client")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/

app.get('/authorize', (req, res)=>{
	state = randomString()
	//区分Url和Uri
	const redirectUrl = url.parse(config.authorizationEndpoint)
	//console.log(redirectUrl)
	//query的属性是给定的还是自己编的？
	redirectUrl.query ={
		response_type: 'code',
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		scope: "permission:name permission:date_of_birth",
		state: state,
	}
	//console.log(url.format(redirectUrl))
	res.redirect(url.format(redirectUrl))
})

app.get('/callback', (req, res)=>{
	if (req.query.state != state){
		res.status(403).send('state miss match')
		return
	}
	const {code} = req.query //const code = req.query.code
	
	//为什么下面这种写法不行?
	//the request made to the token endpoint should 
	//contain the correct authorization code in the request body
	/*axios.post( "http://localhost:9001/token", {	
		//url: config.tokenEndpoint,
		auth: {
			username: config.clientId,
			password: config.clientSecret,
		},
		data:{
			code,
		},
		validateStatus: null,
	})*/
	axios( {	
		method: 'post',
		url: config.tokenEndpoint,
		auth: {
			username: config.clientId,
			password: config.clientSecret,
		},
		data:{
			code,
		},
		validateStatus: null,
	})
	.then( response=>{ 
		//handle success
		//客户端身份验证成功，收到回应后，response里会包含token
		//把这个token发去protected-resource服务器，去获取相关信息
		return axios({
			method: 'get',
			url: config.userInfoEndpoint,
			headers: {
				authorization: "bearer "+response.data.access_token,
			}
		})
		.then(response=>{
			//handle success
			//获取的userinfo在response里面
			//把它拿出来并渲染页面
			res.render('welcome', {
				user: response.data
			})
		})
	})
})

//

const server = app.listen(config.port, "localhost", function () {
	var host = server.address().address
	var port = server.address().port
})

// for testing purposes

module.exports = {
	app,
	server,
	getState() {
		return state
	},
	setState(s) {
		state = s
	},
}
