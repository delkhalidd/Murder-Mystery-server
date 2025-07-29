const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../model/User");

async function register(req, res) {
    try {
        const data = req.body;

        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));

        data["password"] = await bcrypt.hash(data.password, salt);
        //console.log(data);
        const result = await User.create(data)

        res.status(201).send({
            user: result,
            token: await result.generateJwt()
        });
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

async function login(req, res) {
    const data = req.body;
    try {
        const user = await User.getOneByUsername(data.username);

        if(!user) {
            throw new Error('User could not be authenticated')
        }

        const match = await user.comparePassword(data.password);

        if (match) {
            res.status(200).json({
                success: true,
                token: await user.generateJwt(),
                user
            });
        } else {
            throw new Error('User could not be authenticated')
        }

    } catch (err) {
      res.status(401).json({ error: err.message });
    }
}

const me = (req, res) => {
  return res.json(req.user);
}

module.exports = {
    register,
    login,
    me
};
