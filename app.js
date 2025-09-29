// Import required modules
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

// Create Express app instance
const app = express();
// Initialize HTTP server with Express
const server = http.createServer(app);
// Instantiate Socket.io on HTTP server
const io = socketio(server);

// Create Chess object instance
const chess = new Chess();

// Initialize players object and current player
let players = {};
let currentPlayer = 'w';

// Configure Express app
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Define route for root URL and render the EJS template
app.get("/", (req, res) => {
    res.render("index", { title: "Custom Chess Game" });
});

// Handle Socket.io connection event
io.on("connection", function (socket) {
    console.log("A user connected:", socket.id);

    // Assign role based on game state
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w"); // Inform player of their role
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole"); // Designate as spectator
    }

    // Handle client disconnection
    socket.on("disconnect", function () {
        console.log("User disconnected:", socket.id);
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
    });

    // Listen for "move" events
    socket.on("move", (move) => {
        try {
            // Validate correct player's turn
            if (chess.turn() === 'w' && socket.id !== players.white) return;
            if (chess.turn() === 'b' && socket.id !== players.black) return;

            const result = chess.move(move);

            // If move is valid, update state and broadcast
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move); // Broadcast move
                io.emit("boardState", chess.fen()); // Send updated board state
            } else {
                console.log("Invalid move: ", move);
                socket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log("Error processing move:", err);
            socket.emit("invalidMove", move);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});