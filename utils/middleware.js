const logger = require("./logger");

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const tokenExtractor = (request, response, next) => {
	// Extract the token from the 'Authorization' header
	const authorization = request.get("authorization");
	if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
		request.token = authorization.substring(7); // Assign the token to request.token
	} else {
		request.token = null;
	}

	next();
};

const userExtractor = async (request, response, next) => {
	try {
		// Extract token
		const token = request.token;
		if (token) {
			// Verify and decode the token
			const decodedToken = jwt.verify(token, process.env.SECRET);
			if (!decodedToken.id) {
				return response.status(401).json({ error: "token invalid" });
			}
			// Find the user by decoded token ID
			const user = await User.findById(decodedToken.id);
			if (!user) {
				return response.status(404).json({ error: "User not found" });
			}
			// Attach the user to the request object
			request.user = user;
		} else {
			return response.status(401).json({ error: "token missing" });
		}
		next();
	} catch (error) {
		next(error);
	}
};

const requestLogger = (request, response, next) => {
	logger.info("Method:", request.method);
	logger.info("Path:  ", request.path);
	logger.info("Body:  ", request.body);
	logger.info("---");
	next();
};

const unknownEndpoint = (request, response) => {
	response.status(404).send({ error: "unknown endpoint" });
};

const errorHandler = (error, request, response, next) => {
	if (error.name === "CastError") {
		return response.status(400).send({ error: "malformatted id" });
	} else if (error.name === "ValidationError") {
		return response.status(400).json({ error: error.message });
	} else if (
		error.name === "MongoServerError" &&
		error.message.includes("E11000 duplicate key error")
	) {
		return response
			.status(400)
			.json({ error: "expected `username` to be unique" });
	} else if (error.name === "JsonWebTokenError") {
		return response.status(401).json({ error: "token invalid" });
	}

	next(error);
};

module.exports = {
	requestLogger,
	unknownEndpoint,
	errorHandler,
	tokenExtractor,
	userExtractor,
};
