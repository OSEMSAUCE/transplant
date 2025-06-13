<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSignUp(event: Event) {
    event.preventDefault();
    if (!email || !password) {
      error = 'Please enter both email and password.';
      return;
    }
    error = '';
    loading = true;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });
    loading = false;
    if (signUpError) {
      error = signUpError.message;
      return;
    }
    alert('Check your email for a confirmation link!');
    email = '';
    password = '';
  }
</script>

<div class="login-container">
  <h2>Sign Up</h2>
  <form onsubmit={handleSignUp}>
    
    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} required />

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button type="submit" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</button>
  </form>
</div>
