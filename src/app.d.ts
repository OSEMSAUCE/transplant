// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		interface Locals extends Record<string, unknown> {
			// Add specific locals here when needed
		}
		interface Platform extends Record<string, unknown> {
			// Add platform-specific properties here when needed
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
