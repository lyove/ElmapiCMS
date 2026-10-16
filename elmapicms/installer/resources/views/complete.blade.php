@extends('installer::layout')

@section('title', 'Installation complete')

@section('content')
    <ul class="steps">
        <li class="is-done">1. Welcome</li>
        <li class="is-done">2. Requirements</li>
        <li class="is-done">3. Configuration</li>
        <li class="is-done">4. Install</li>
        <li class="is-active">5. Done</li>
    </ul>

    <h1>Installation complete</h1>
    <p class="lede">ElmapiCMS is ready. Add the cron job below, then finish.</p>

    <div class="alert alert-ok">
        Sign in with <strong>{{ $done['admin_email'] }}</strong>
        at <a href="{{ rtrim($done['app_url'], '/').'/login' }}">{{ rtrim($done['app_url'], '/').'/login' }}</a>
    </div>

    <h2>Webhook cron job</h2>
    <p class="lede">
        In your hosting panel, create a cron job that runs <strong>once per minute</strong> (<code>* * * * *</code>).
        Adjust the PHP binary if your host documents a different path.
    </p>
    <pre class="code-block">{{ $done['cron'] }}</pre>

    @if ($log !== [])
        <ul class="log">
            @foreach ($log as $line)
                <li>{{ $line }}</li>
            @endforeach
        </ul>
    @endif

    <form method="post" action="{{ route('install.finish') }}">
        @csrf
        <div class="actions">
            <a class="btn btn-secondary" href="{{ rtrim($done['app_url'], '/').'/login' }}" target="_blank" rel="noopener">Open login</a>
            <button class="btn btn-primary" type="submit">Finish</button>
        </div>
    </form>

    <p class="meta">
        The installer is now locked: every <code>/install</code> route returns 404
        until <code>storage/app/installed</code> is removed.
    </p>
@endsection
