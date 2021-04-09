const express = require('express');
const router = express.Router();

/**
 * @route POST api/posts
 * @desc Create a post
 * @access Private
 */
router.post('/', (req, res) => {
    res.send('Posts route');
});

module.exports = router;
