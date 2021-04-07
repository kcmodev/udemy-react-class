const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');
const Profile = require('../../models/Profile');

/**
 * @route GET api/profile/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.user.id,
        }).populate('user', ['name', 'avatar']);

        if (!profile) {
            return res.status(400).json({ msg: 'No profile found.' });
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route POST api/profile
 * @desc Create or update user's profile
 * @access Private
 */

router.post(
    '/',
    [
        auth,
        [
            check('status', 'Status is required').not().isEmpty(),
            check('skills', 'Skills is a required field.').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.mapped() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubUsername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin,
        } = req.body;

        // build profile object
        const profileFields = {};
        profileFields.user = req.user.id;

        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (status) profileFields.status = status;

        if (skills) {
            profileFields.skills = skills
                .split(',')
                .map((skill) => skill.trim());
        }

        if (bio) profileFields.bio = bio;
        if (githubUsername) profileFields.githubUsername = githubUsername;

        // build social object
        profileFields.social = {};
        if (youtube) profileFields.social.youtube = youtube;
        if (twitter) profileFields.social.youtube = twitter;
        if (facebook) profileFields.social.youtube = facebook;
        if (linkedin) profileFields.social.youtube = linkedin;
        if (instagram) profileFields.social.youtube = instagram;

        try {
            let profile = await Profile.findOne({ user: req.user.id });

            // profile found
            if (profile) {
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );

                return res.json(profile);
            }

            // profile not found, create new
            profile = new Profile(profileFields);
            await profile.save();
            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error.');
        }
    }
);

module.exports = router;
