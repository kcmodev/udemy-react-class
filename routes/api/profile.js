const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const config = require('config');
const axios = require('axios');

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
            return res.status(400).json({ errors: errors.array() });
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
        if (twitter) profileFields.social.twitter = twitter;
        if (facebook) profileFields.social.facebook = facebook;
        if (linkedin) profileFields.social.linkedin = linkedin;
        if (instagram) profileFields.social.instagram = instagram;

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

/**
 * @route GET api/profile
 * @desc Get all profiles
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', [
            'name',
            'avatar',
        ]);
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route GET api/profile/user/:user_id
 * @desc Get profile by user id
 * @access Public
 */
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.params.user_id,
        }).populate('user', ['name', 'avatar']);

        if (!profile) {
            return res.status(400).json({ msg: 'Profile not found.' });
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);

        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Profile not found.' });
        }

        res.status(500).send('Server error.');
    }
});

/**
 * @route DELETE api/profile/me
 * @desc Delete profile, user, and posts
 * @access Private
 */
router.delete('/', auth, async (req, res) => {
    try {
        // Remove profile
        await Profile.findOneAndRemove({ user: req.user.id });

        // Remove user
        await User.findOneAndRemove({ _id: req.user.id });

        res.json({ msg: 'User deleted.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route PUT api/profile/experience
 * @desc Add experience to a profile
 * @access Private
 */
router.put(
    '/experience',
    [
        auth,
        [
            check('title', 'Title is required.').not().isEmpty(),
            check('company', 'Company is required.').not().isEmpty(),
            check('from', 'From date is required.').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.mapped() });
        }

        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        } = req.body;

        const newExperience = {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        };

        try {
            const profile = await Profile.findOne({ user: req.user.id });

            profile.experience.unshift(newExperience);
            await profile.save();

            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error.');
        }
    }
);

/**
 * @route DELETE api/profile/experience/:exp_id
 * @desc Delete experience from a profile
 * @access Private
 */
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        // Find profile
        const profile = await Profile.findOne({ user: req.user.id });

        // Remove experience from the profile
        const removeIndex = profile.experience
            .map((item) => item.id)
            .indexOf(req.params.exp_id);

        profile.experience.splice(removeIndex, 1);

        await profile.save();
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route PUT api/profile/education
 * @desc Add education to a profile
 * @access Private
 */
router.put(
    '/education',
    [
        auth,
        [
            check('school', 'School is required.').not().isEmpty(),
            check('degree', 'Degree is required.').not().isEmpty(),
            check('fieldOfStudy', 'Field of study is required.')
                .not()
                .isEmpty(),
            check('from', 'From date is required.').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.mapped() });
        }

        const {
            school,
            degree,
            fieldOfStudy,
            from,
            to,
            current,
            description,
        } = req.body;

        const newEducation = {
            school,
            degree,
            fieldOfStudy,
            from,
            to,
            current,
            description,
        };

        try {
            const profile = await Profile.findOne({ user: req.user.id });

            profile.education.unshift(newEducation);
            await profile.save();

            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error.');
        }
    }
);

/**
 * @route DELETE api/profile/education/:education_id
 * @desc Delete education from a profile
 * @access Private
 */
router.delete('/education/:exp_id', auth, async (req, res) => {
    try {
        // Find profile
        const profile = await Profile.findOne({ user: req.user.id });

        // Remove experience from the profile
        const removeIndex = profile.education
            .map((item) => item.id)
            .indexOf(req.params.exp_id);

        profile.education.splice(removeIndex, 1);

        await profile.save();
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error.');
    }
});

/**
 * @route GET api/profile/github/:username
 * @desc Get user repos from Github
 * @access Public
 */
router.get('/github/:username', async (req, res) => {
    try {
        const uri = encodeURI(
            `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
        );

        const headers = {
            'user-agent': 'node.js',
            Authorization: `token ${config.get('githubPAToken')}`,
        };

        const gitHubResponse = await axios.get(uri, { headers });

        return res.json(gitHubResponse.data);
    } catch (err) {
        console.error(err.message);
        res.status(404).send('No github profile found.');
    }
});

module.exports = router;
