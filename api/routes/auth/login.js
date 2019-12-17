/* eslint-disable object-curly-newline */
/* eslint-disable no-console */
const env = require('../../libs/env');
const { User } = require('../../models');
const { login } = require('../../libs/jwt');
const {
  UserPaymentBaseDirGet,
  UserPaymentDirInit,
  Base64ImageDataToFile,
  ThumbImageGen,
  ImageFileRemove
}  = require('../../libs/image');

const description = {
  en: `Login ${env.appName} with your ABT Wallet`,
  zh: `用 ABT 钱包登录 ${env.appName}`,
};

/*for abt wallet 2.0 to request avatar*/
const loginReqFields = ['fullName', 'email', 'avatar'];

/*The ios wallet 1.0 will crash when request avatar*/
//const loginReqFields = ['fullName', 'email'];

module.exports = {
  action: 'login',
  claims: {
    profile: ({ extraParams: { locale } }) => ({
      fields: loginReqFields,
      description: description[locale] || description.en,
    }),
  },
  onAuth: async ({ claims, userDid, token, storage }) => {
    try {
      const profile = claims.find(x => x.type === 'profile');
      const exist = await User.findOne({ did: userDid });
      if (exist) {
        //console.log('update user', userDid, JSON.stringify(profile));
        console.log('update user', userDid);
        console.log('update user fullName', profile.fullName);
        console.log('update user email', profile.email);

        //init user dir
        await UserPaymentDirInit(userDid);

        if(typeof(profile.avatar) != "undefined" && profile.avatar.length > 0){
          console.log('update user avatar.length', profile.avatar.length);

          //avatar to user dir
          Base64ImageDataToFile(profile.avatar, UserPaymentBaseDirGet(userDid)+'/avatar.jpg');
          //avatar resize to small avatar for newsflash usage
          const base64ImageData = await ThumbImageGen(UserPaymentBaseDirGet(userDid)+'/avatar.jpg', 
            UserPaymentBaseDirGet(userDid)+'/avatar_small.jpg', 80, 80);

          //avatar to user db
          exist.avatar = profile.avatar;
          exist.avatar_small = base64ImageData;
          
          //remove avatar files
          await ImageFileRemove(UserPaymentBaseDirGet(userDid)+'/avatar.jpg');
          await ImageFileRemove(UserPaymentBaseDirGet(userDid)+'/avatar_small.jpg');
        }
        exist.name = profile.fullName;
        exist.email = profile.email;
      
        await exist.save();
      } else {
        //console.log('create user', userDid, JSON.stringify(profile));
        console.log('create user', userDid);
        console.log('create user fullName', profile.fullName);
        console.log('create user email', profile.email);

        //init user dir
        await UserPaymentDirInit(userDid);

        if(typeof(profile.avatar) != "undefined" && profile.avatar.length > 0){
          console.log('create user avatar.length', profile.avatar.length);
  
          //avatar to user dir
          Base64ImageDataToFile(profile.avatar, UserPaymentBaseDirGet(userDid)+'/avatar.jpg');
          //avatar resize to small avatar for newsflash usage
          const base64ImageData = await ThumbImageGen(UserPaymentBaseDirGet(userDid)+'/avatar.jpg', 
            UserPaymentBaseDirGet(userDid)+'/avatar_small.jpg', 80, 80);

          const user = new User({
            did: userDid,
            avatar: profile.avatar,
            avatar_small: base64ImageData,
            name: profile.fullName,
            email: profile.email,
          });
          await user.save();
          
          //remove avatar files
          await ImageFileRemove(UserPaymentBaseDirGet(userDid)+'/avatar.jpg');
          await ImageFileRemove(UserPaymentBaseDirGet(userDid)+'/avatar_small.jpg');
        }else{
          const user = new User({
            did: userDid,
            name: profile.fullName,
            email: profile.email,
          });
          await user.save();
        }
      }

      // Generate new session token that client can save to localStorage
      const sessionToken = await login(userDid);
      await storage.update(token, { did: userDid, sessionToken });
      console.log('login.onAuth.login', { userDid, sessionToken });
      
      /*
      return {
        callbackParams: {
          loginToken: sessionToken,
        },
      };
      */
      
    } catch (err) {
      console.error('login.onAuth.error', err);
    }
  },
};
