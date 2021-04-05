const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

/**
 * @route GET api/auth
 * @desc Test route
 * @access Public
 */
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error.');
    }
});

/**
 * @route POST api/auth
 * @desc Authenticate user and get token
 * @access Public
 */
router.post(
    '/',
    [
        check('email', 'Please enter a valid email').isEmail(),
        check('password', 'Password is required.').exists(),
    ],

    // Handle request and response
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        const { email, password } = req.body;

        try {
            // Check database for user
            let user = await User.findOne({ email });

            if (!user) {
                return res.status(500).json({
                    errors: { msg: 'Invalid credentials.' },
                });
            }

            // Return JSON Webtoken
            const payload = {
                user: {
                    id: user.id,
                },
            };

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(500).json({
                    errors: { msg: 'Invalid credentials.' },
                });
            }

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
