# Backbeam lambda

Backbeam lambda is a command line tool and a development server that makes a lot easier to create web applications based on AWS lambda.

# Get started

First, create a credentials file for AWS in `~/.aws/credentials`. Example:

```
[default]
aws_access_key_id = YOUR_AWS_ACCESS_KEY
aws_secret_access_key = YOUR_AWS_SECRET_ACCESS_KEY
```

Install `backbeam-lambda`

```
npm install backbeam-lambda -g
```

Start a project

```
mkdir myproject
cd myproject
backbeam-lambda init
```

Create a new controller

```
backbeam-lambda controllers create
```

Sync a controller

```
backbeam-lambda controllers sync
```

Deploy the API

```
backbeam-lambda api deploy
```
