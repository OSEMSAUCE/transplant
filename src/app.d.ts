// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		interface Locals {
			// ... other locals ...
		}
		interface Platform {
			// ... platform specific ...
		}
		interface PrivateEnv {
			DATABASE_URL: string;
		}
		interface PublicEnv {
			PUBLIC_SUPABASE_URL: string;
			PUBLIC_SUPABASE_ANON_KEY: string;
		}
	}
}

export {};
