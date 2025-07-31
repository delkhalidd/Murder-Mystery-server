# Mystery Minds

## Getting Started

First you will need to set-up a `.env` file. Refer to the below for the required values:
```dotenv
OPENAI_API_KEY=secret # Your OpenAI API key
SECRET_TOKEN=skdjhbkjsdfg # A secret string
```

### Docker
The easiest way to get set up is using Docker. Simply install Docker on your machine, and then run:

```bash
$ docker compose up -d
```

The site will now be available at http://localhost:3000. The site will be available to the internet via a Cloudflare
tunnel. To find the URL, run:
```bash
$ docker compose logs cloudflared
```
Your URL (i.e. https://ht-maintenance-episode-spray.trycloudflare.com) will now be in your console.

### Without Docker
To run without Docker, there are a few things you'll need. First, clone our [client repo](https://github.com/delkhalidd/Murder-Mystery-client)
and follow the build instructions there to create a client build (`./dist`).
You will also need your own Postgres database (either hosted locally or with a provider like Supabase), and a URL to
connect to it.

Now we need to create some more environment variables. In your `.env` file, add the following:
```dotenv
CLIENT_BUILD_DIR=/home/user/Murder-Mystery-client/dist # the absolute path to your client build
DB_URL=postgresql://postgres:password@localhost:5432/mystery_db?pool_mode=transaction # the postgres connection URL
```

Now just run:
```bash
$ npm i # you only need to run this once
$ npm run setup-db # you only need to run this once
$ npm start
```

And a server should be available at http://localhost:3000!

## API Documentation
API documentation is available [on Postman](https://documenter.getpostman.com/view/33650941/2sB3BAKXNU).
