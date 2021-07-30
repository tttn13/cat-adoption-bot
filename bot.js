const dotenv = require('dotenv')
const Twitter = require('twitter')
const fetch = require('node-fetch')

dotenv.config({ path: './config.env' })
const twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
})
const newCatsThisHour = async () => {
    const hourAgo = new Date(new Date().getTime() - 1000 * 60 * 60).toISOString();
    let catsWithPhotos = []
    try {
        const tokenResponse = await fetch('https://api.petfinder.com/v2/oauth2/token', {
            method: 'POST',
            body: `grant_type=client_credentials&client_id=${process.env.PF_API_KEY}&client_secret=${process.env.PF_SECRET_KEY}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }      
        })
        const {access_token} = await tokenResponse.json()
        const catResponse = await fetch(
            `https://api.petfinder.com/v2/animals?type=cat&location=98121&distance=100&after=${hourAgo}`,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        )
        const { animals } = await catResponse.json()
        if (animals.length===0) {
            return null
        }
        if (animals.length > 0){
            //Filter cats with photos
            catsWithPhotos = animals.filter(animal => animal.photos.length > 0)
            return catsWithPhotos
        } 
    } catch (error) {
        console.log(error)
    }
}

const shareCat = async() => {
    const newCats = await newCatsThisHour()
    if (newCats) {
        twitterClient.post(
            'statuses/update',
            {
                status: `I'm looking for a home! My name is ${newCats[0].name}. I am a ${newCats[0].gender} ${newCats[0].age} cat. 
                ${newCats[0].url} `,
            },
            function(err, tweet, response) {
                if(!err) console.log(tweet)
                else console.log(err)
            }
        )
    }
}
shareCat()
setInterval(shareCat, 1000 * 60 * 60) //share every hour afterwards
