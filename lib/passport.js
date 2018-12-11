'use strict';
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jwt-simple');
var CONFIG = require('./config');
var Users = require('../db/users');


module.exports = function (passport) {
    var opts = {};
    opts.secretOrKey = CONFIG.ADMIN.SECRET;
    opts.issuer = CONFIG.EMAIL.POOL_MAIL;
    opts.audience = 'http://' + CONFIG.FRONTEND.HOST + ':' + CONFIG.FRONTEND.PORT;
    opts.jwtFromRequest = ExtractJwt.fromAuthHeader();

    passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
        Users.findOne({userName: jwt_payload.sub}, function (err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
            }
            else done(null, false, 'User found in token not found');
        });
    }));
};
