<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSignIn(event: Event) {
    event.preventDefault();
    if (!email || !password) {
      error = 'Please enter both email and password.';
      return;
    }
    error = '';
    loading = true;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    loading = false;
    if (signInError) {
      error = signInError.message;
      return;
    }
    // Redirect or show success
    alert('Signed in!');
    email = '';
    password = '';
  }
</script>

<div class="login-container">
  <h2>Sign In</h2>
  <form onsubmit={handleSignIn}>
    
    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} required />

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button type="submit" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
  </form>
</div>
