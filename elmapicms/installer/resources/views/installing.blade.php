@extends('installer::layout')

@section('title', 'Installing')

@section('content')
    <ul class="steps">
        <li class="is-done">1. Welcome</li>
        <li class="is-done">2. Requirements</li>
        <li class="is-done">3. Configuration</li>
        <li class="is-active">4. Install</li>
        <li>5. Done</li>
    </ul>

    <h1>Installing</h1>
    <p class="lede">
        <span class="spinner" aria-hidden="true"></span>
        Migrating the database, seeding and finalizing <code>.env</code>. Keep this tab open.
    </p>

    <form id="install-form" method="post" action="{{ route('install.run.post') }}">
        @csrf
    </form>

    <script>
    document.getElementById('install-form').submit();
    </script>

    <noscript>
        <div class="actions">
            <button class="btn btn-primary" type="submit" form="install-form">Run installation</button>
        </div>
    </noscript>
@endsection
