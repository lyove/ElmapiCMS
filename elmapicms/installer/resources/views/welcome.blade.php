@extends('installer::layout')

@section('title', 'Welcome')

@section('content')
    <ul class="steps">
        <li class="is-active">1. Welcome</li>
        <li>2. Requirements</li>
        <li>3. Configuration</li>
        <li>4. Install</li>
        <li>5. Done</li>
    </ul>

    <h1>Welcome to ElmapiCMS</h1>
    <p class="lede">
        This wizard checks your server, writes the <code>.env</code> file, creates the database
        schema and sets up the first admin account. The wizard runs from <code>/install</code>
        and locks itself as soon as installation completes.
    </p>

    <div class="actions">
        <a class="btn btn-primary" href="{{ route('install.requirements') }}">Start installation</a>
    </div>
@endsection
