<script>
  let email = '';
  let password = '';
  let error = '';

  function handleSignUp(event) {
    event.preventDefault();
    // Placeholder: Add signup logic here
    if (!email || !password) {
      error = 'Please enter both email and password.';
      return;
    }
    error = '';
    // Simulate signup (replace with real logic)
    alert(`Signed up as ${email}`);
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

    <button type="submit">Sign Up</button>
  </form>
</div>
