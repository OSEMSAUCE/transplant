<script>
  let email = '';
  let password = '';
  let error = '';

  function handleSignIn(event) {
    event.preventDefault();
    // Placeholder: Add authentication logic here
    if (!email || !password) {
      error = 'Please enter both email and password.';
      return;
    }
    error = '';
    // Simulate sign-in (replace with real logic)
    alert(`Signed in as ${email}`);
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

    <button type="submit">Sign In</button>
  </form>
</div>
<!-- 
<style>
  .login-container {
    max-width: 350px;
    margin: 3rem auto;
    padding: 2rem;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  }
  h2 {
    text-align: center;
    margin-bottom: 1.2rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    font-weight: 500;
  }
  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  button {
    padding: 0.7rem;
    background: #0070f3;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
  button:hover {
    background: #005bb5;
  }
  .error {
    color: #b00020;
    background: #fff0f0;
    padding: 0.5rem;
    border-radius: 4px;
    text-align: center;
    font-size: 0.95rem;
  }
</style> -->
