const express = require("express")
const bodyParser = require("body-parser")
const fs = require("fs")
const { timeout } = require("./utils")
const { JsonWebTokenError } = require("jsonwebtoken")
const jwt = require("jsonwebtoken")


const config = {
	port: 9002,
	publicKey: fs.readFileSync("assets/public_key.pem"),
}

const users = {
	user1: {
		username: "user1",
		name: "User 1",
		date_of_birth: "7th October 1990",
		weight: 57,
	},
	john: {
		username: "john",
		name: "John Appleseed",
		date_of_birth: "12th September 1998",
		weight: 87,
	},
}

const app = express()
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/

app.get('/user-info', (req, res) => {
	if (!req.headers.authorization) {
		res.status(401).send()
		return
	}
	//req.headers.authorization, is a string 
	//with the value "bearer <your_token_payload>"
	const authToken = req.headers.authorization.slice("bearer ".length)
	//authToken是编码后的用户信息，需要通过jwt.verify来decode
	
	let userInfo = null
	try {
		userInfo = jwt.verify(
			authToken,
			config.publicKey,
			{algorithms: ["RS256"]},
		)
	} catch(e){
		res.status(401).send()
		return
	}
	if (!userInfo){
		res.status(401).send()
		return
	}
	//console.log(userInfo)
	//console.log(authToken)
	//now userInfo contains userName and scope

	const user = users[userInfo.userName]
	const scope = userInfo.scope.split(' ')
	//console.log(scope)

	//user是有完整的用户信息
	//但是根据权限的不同，有些field不能被访问
	//下面创建的变量存储“可以被访问的信息”
	const userWithRestrictedFields={} 
	
	for (let i = 0; i < scope.length; i++ ){
		const field = scope[i].slice('permission:'.length)
		userWithRestrictedFields[field] = user[field]
	}
	res.json(userWithRestrictedFields)
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
}