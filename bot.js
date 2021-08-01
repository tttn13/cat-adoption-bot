const dotenv = require('dotenv');
const Twitter = require('twitter');
const fetch = require('node-fetch');

dotenv.config({ path: './config.env' });
const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

const newCatsThisHour = async () => {
  console.log('Checking for new cat');
  const hourAgo = new Date(new Date().getTime() - 1000 * 60 * 60).toISOString();
  let catsWithPhotos = [];
  try {
    const tokenResponse = await fetch(
      'https://api.petfinder.com/v2/oauth2/token',
      {
        method: 'POST',
        body: `grant_type=client_credentials&client_id=${process.env.PF_API_KEY}&client_secret=${process.env.PF_SECRET_KEY}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const { access_token } = await tokenResponse.json();
    const catResponse = await fetch(
      `https://api.petfinder.com/v2/animals?type=cat&location=98121&distance=100&after=${hourAgo}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const { animals } = await catResponse.json();
    if (animals.length === 0) {
      console.log('No new cats');
      return null;
    }
    if (animals.length > 0) {
      console.log('Found some cats');
      //Filter cats with photos
      catsWithPhotos = animals.filter((animal) => animal.photos.length > 0);
      return catsWithPhotos;
    }
  } catch (error) {
    console.log(error);
  }
};

const shareCat = async () => {
  const newCats = await newCatsThisHour();
  if (newCats) {
    twitterClient.post(
      'statuses/update',
      {
        status: `I'm looking for a home! My name is ${newCats[0].name}. I am a ${newCats[0].gender} ${newCats[0].age} cat. 
                ${newCats[0].url} `,
      },
      function (err, tweet, response) {
        if (!err) console.log(tweet);
        else console.log(err);
      }
    );
    console.log('finish sharing');
  }
};

//create a search function to look for tweets with hashtag kitty cat
const searchTweets = (callback) => {
  let params = {
    q: '#kitty #cat filter:media',
    result_type: "recent",
    count: 3,
    lang: 'en',
  };

  twitterClient.get('search/tweets', params, (err, data, response) => {
    let tweetList = [];
    if (!err) {
      for (let i = 0; i < data.statuses.length; i++) {
        let tweet = data.statuses[i];
        tweetList.push(tweet);
        console.log("tweet id is", tweet.id_str)
        callback(tweet);
      }
      console.log("This is the tweet list length", tweetList.length)
      return;
    } else {
      console.log('Cannot grab tweet because of ', err);
    }
  });
};

const retweetFn = (tweet_object) => {
  twitterClient.post(
    'statuses/retweet/' +
    tweet_object.id_str,
    (err, response) => {
      if (err) {
        console.log('Cannot Retweet your Tweet because of', err);
        return;
      }
      console.log('Success, Check your Account for the Retweet!');
    }
  );
};

const main = () => {
    searchTweets(retweetFn)
    shareCat();
}
main()
setInterval(main, 1000 * 60 * 60); //share every hour afterwards


