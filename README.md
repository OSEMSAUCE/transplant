# Transplant App

This app takes in CSV's and reformats them and transforms them then maps them to a database. It's managing reforestation data which contains info about tree crops and land that has been planted. It uses GPS locations and polygons. Though it would be useful for other types of data because you can import lazily formatted CSV's and it cleans them up by regognizing certain data types and reformatting them.
If you're interested to help please let me know if you have any questions. It's for a good cause, bringing transparency to reforestation and nature based offsets. 


## Svelte template readme:

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).


## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Database
you run `npm run db:pull` to sync the orm
GOTCHA: when you run `npm run db:pull` two issues happen:

1. it errors on the `export const land: any` you have to add `: any`
2. search `""` and replace with `"` (remove the extra quotes)

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.


🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️ NOTE TO DEV | SELF  🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️


## ToDo's
	// 9 May 2025 
	DONE// Normalize land and crop table when names are dropped.
	DONE// make landName required for land table. TreeName is require for tree table. 
	// REFUSE AND STYLE: columns that are not unique to land consistent (if land repeats, cant have different values on the same land) then they wont' Highlight.
	// add org and project name.


## Gotcha's

GOTCHA: when you run `npm run db:pull` two issues happen:
1. it errors on the `export const land: any` you have to add `: any`
2. search `""` and replace with `"` (remove the extra quotes)

Filter DB Attributes:
- +page.server.ts filters all the attributes from the db.
- newDbTables.svelte filters all the attributes shown on the front end.

## Format Detection

Run this awesome tester thing open /Users/chrisharris/Desktop/transplant/formatDetectionTester.html