const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../../models/User');

/**
 * @route POST api/users
 * @desc Register user
 * @access Public
 */
router.post(
    '/',
    [
        check('name', 'Name is required.').not().isEmpty(),
        check('email', 'Please enter a valid email').isEmail(),
        check(
            'password',
            'Please enter a password between 6 and 30 characters.'
        ).isLength({ min: 6, max: 30 }),
    ],

    // Handle request and response
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        const { name, email, password } = req.body;

        try {
            // Check database for user
            let user = await User.findOne({ email });

            if (user) {
                return res.status(500).json({
                    errors: { msg: 'User already exists.' },
                });
            }

            // Get user's Gravatar
            const avatar = gravatar.url(email, {
                s: '200', // size
                r: 'pg', // rating
                d: 'mm', // default avatar image
            });

            user = new User({
                name,
                email,
                avatar,
                password,
            });

            // Encrypt & hash the password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save(); // save user to database

            // Return JSON Webtoken
            const payload = {
                user: {
                    id: user.id,
                },
            };

            jwt.sign(
                payload,
                config.get('jwtSecret'),
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) {
                        throw err;
                    }
                    res.json({ token });
                }
            );
        } catch (err) {
            console.log(`Error validating user: ${err.message}`);
            res.status(500).send('Server error.');
        }
    }
);

module.exports = router;
