# Transplant App

This app aggrigates reforestation data for the sake of transparency, to share who is planting what trees and where. This makes tree planting competative and greatly reduces fraud / greenwashing etc. It is the spirit of open source environmental movement (OSEM🤘🌲).
The app takes in CSV's of reforestation data and maps them to a database. The data contains tree crops, and land, planting numbers, dates and stakeholders. It uses GPS 'pins' and polygons. It also cleans up poorly formatted or loosely defined data types by recognizing the types and reformatting them where possible, disposing of the rest.
If you're interested to help please let me know if you have any questions info@osemsauce.com

## Werk 💪🏼️🌲️

There is a very active [Github Issues](https://github.com/OSEMSAUCE/transplant/issues) board. Please lmk if you have any questions.

## Contributors

## Svelte template readme:

Everything you need to build a Svelte project, powered by [`SvelteKit`](https://github.com/sveltejs/cli).

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

you run `npm run db:sync:prod` to sync the orm

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Gotcha's

GOTCHA: when you run `npm run db:pull` two issues happen:

1. it errors on the `export const land: any` you have to add `: any`
2. search `""` and replace with `"` (remove the extra quotes)

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE) for details.
