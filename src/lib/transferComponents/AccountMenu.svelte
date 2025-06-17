<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import type { User } from '@supabase/supabase-js';
  
  let user: User | null = null;
  let loading = true;
  let menuOpen = false;
  
  onMount(() => {
    // Get initial session
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      user = data.session?.user || null;
      loading = false;
    };
    
    fetchSession();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  });
  
  async function handleLogout() {
    await supabase.auth.signOut();
    menuOpen = false;
  }
  
  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

<div class="account-menu">
  {#if loading}
    <div class="account-button">Loading...</div>
  {:else if user}
    <button class="account-button" on:click={toggleMenu}>
      {user.email ? user.email.split('@')[0] : 'User'}
    </button>
    {#if menuOpen}
      <div class="dropdown-menu">
        <div class="user-email">{user.email || 'No email available'}</div>
        <button on:click={handleLogout}>Logout</button>
      </div>
    {/if}
  {:else}
    <div class="auth-links">
      <a href="/login" class="login-link">Login</a>
      <a href="/signup" class="signup-link">Sign Up</a>
    </div>
  {/if}
</div>

<style>
  .account-menu {
    position: relative;
  }
  
  .account-button {
    /* padding: 0.5rem 1rem; */
    border-radius: 4px;
    cursor: pointer;
    background-color: #4a5568;
    color: white;
    border: none;
  }
  
  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background-color: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 0.5rem;
    width: 200px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
  
  .user-email {
    padding: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #4a5568;
  }
  
  .dropdown-menu button {
    width: 100%;
    text-align: left;
    /* padding: 0.5rem; */
    background: none;
    border: none;
    cursor: pointer;
    color: #e53e3e;
  }
  
  .dropdown-menu button:hover {
    background-color: #f7fafc;
  }
  
  .auth-links {
    display: flex;
    gap: 1rem;
  }
  
  .login-link, .signup-link {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
  }
  
  .login-link {
    background-color: #4a5568;
    color: white;
  }
  
  .signup-link {
    border: 1px solid #4a5568;
    color: #4a5568;
  }
</style>
