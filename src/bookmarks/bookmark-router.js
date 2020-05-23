const express = require("express");
const winston = require("winston");
const { NODE_ENV } = require("../config");
const { v4: uuid } = require("uuid");

const bookRouter = express.Router();
const bodyParser = express.json();

const { bookmarks } = require("../store");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: "info.log" })],
});

if (NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

bookRouter
    .route("/bookmarks")
    .get((req, res) => {
        res.json(bookmarks);
    })
    .post(bodyParser, (req, res) => {
        const { title, link, desc = "", rating = "3" } = req.body;

        // optional components: title, desc, rating
        // title becomes link if not supplied, desc is empty, rating is 3

        if (!link) {
            return res.status(400).send("Link required");
        }

        if (!/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(link)) {
            return res.status(400).send("Valid URL required");
        }

        if (desc && desc.length > 140) {
            return res.status(400).send("Description exceeds character limit");
        }

        if (Number(rating) < 0 || Number(rating) > 5) {
            return res.status(400).send("Rating must be between zero and five");
        }

        // if all pass
        const bookTitle = title ? title : link;

        const id = uuid();
        const newBook = {
            id,
            bookTitle,
            link,
            desc,
            rating,
        };

        bookmarks.push(newBook);

        logger.info(`Bookmark with id ${id} created`);
        res.status(201)
            .location(`http://localhost:8000/bookmarks/${id}`)
            .json(newBook);
    });

bookRouter
    .route("/bookmarks/:id")
    .get((req, res) => {
        const { id } = req.params;
        const book = bookmarks.find((c) => c.id == id);

        if (!book) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send("Bookmark Not Found");
        }

        res.json(book);
    })
    .delete((req, res) => {
        const { id } = req.params;

        const bookIndex = bookmarks.findIndex((c) => c.id == id);

        if (bookIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send("Bookmark not found");
        }

        bookmarks.splice(bookIndex, 1);

        logger.info(`Bookmark with id ${id} deleted.`);

        res.status(204).end();
    });

module.exports = bookRouter;
