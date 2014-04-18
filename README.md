Mongoose i18n Schema Plugin
===========================

Surprisingly there is not a proper plugin for this.
I found a couple gists that do this:

- [as a plugin](https://gist.github.com/viczam/3306456d3c63e2c21f1d)
- [extending Schema class](https://gist.github.com/hetsch/3925111)

I didn’t see anything in the npm repo, so...

Usage
-----

Install:

```bash
npm i --save mongoose mongoose-i18n
```

Create your schema:

```coffee-script
mongoose = require 'mongoose'
i18nPlugin = require 'mongoose-i18n'

# ... create your schema, e.g. MySchema ... #

MySchema.plugin i18nPlugin, languages: ['en', 'fr'], defaultLanguage: 'en'

```