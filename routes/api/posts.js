const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const User = require('../../models/User');
// const Profile = require('../../models/Profile');
const Post = require('../../models/Post');

/**
 * @route POST api/posts
 * @desc Create a post
 * @access Private
 */
router.post(
    '/',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        try {
            const user = await User.findById(req.user.id).select('-password');

            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id,
            });

            await newPost.save();

            res.json(newPost);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error.');
        }
    }
);

/**
 * @route GET api/posts
 * @desc Get all posts
 * @access Private
 */

router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route GET api/posts/:post_id
 * @desc Get post by post id
 * @access Private
 */

router.get('/:post_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found.' });
        }

        res.json(post);
    } catch (err) {
        console.error(err.message);

        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found.' });
        }

        res.status(500).send('Server error.');
    }
});

/**
 * @route DELETE api/posts/:post_id
 * @desc Delete post by post id
 * @access Private
 */

router.delete('/:post_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        // Check if user owns post
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        } else {
            await post.remove();
        }

        if (!post) {
            return res.status(404).json({ msg: 'Post not found.' });
        }

        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err.message);

        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found.' });
        }

        res.status(500).send('Server error.');
    }
});

/**
 * @route PUT api/posts/like/:post_id
 * @desc Add a like to a post
 * @access Private
 */

router.put('/like/:post_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        // Check is post already liked by this user
        if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
                .length > 0
        ) {
            return res
                .status(400)
                .json({ msg: "Can't like a post more than once" });
        }

        post.likes.unshift({ user: req.user.id });
        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

/**
 * @route DELETE api/posts/unlike/:post_id
 * @desc Remove a like from a post
 * @access Private
 */

router.put('/unlike/:post_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        // Check is post already liked by this user
        if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
                .length === 0
        ) {
            return res.status(400).json({ msg: 'Post has not been liked.' });
        }

        // Get remove index
        const removeIndex = post.likes
            .map((like) => like.user.toString())
            .indexOf(req.user.id);

        post.likes.splice(removeIndex, 1);

        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

/**
 * @route POST api/posts/comment/:post_id
 * @desc Comment on a post
 * @access Private
 */
router.post(
    '/comment/:post_id',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        try {
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(req.params.post_id);

            const newComment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id,
            };

            post.comments.unshift(newComment);

            await post.save();

            res.json(post.comments);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error.');
        }
    }
);

/**
 * @route DELETE api/posts/comment/:post_id/:comment_id
 * @desc Remove a comment from a post
 * @access Private
 */

router.delete('/comment/:post_id/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);
        const comment = await post.comments.find(
            (comment) => comment.id === req.params.comment_id
        );

        // Check is post already liked by this user
        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exist.' });
        }

        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized.' });
        }

        // Get remove index
        const removeIndex = post.comments
            .map((comment) => comment.user.toString())
            .indexOf(req.user.id);

        post.comments.splice(removeIndex, 1);

        await post.save();

        res.json(post.comments);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
