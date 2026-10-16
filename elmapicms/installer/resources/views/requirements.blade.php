@extends('installer::layout')

@section('title', 'Requirements')

@section('content')
    <ul class="steps">
        <li class="is-done">1. Welcome</li>
        <li class="is-active">2. Requirements</li>
        <li>3. Configuration</li>
        <li>4. Install</li>
        <li>5. Done</li>
    </ul>

    <h1>Requirements</h1>
    <p class="lede">Checking that this server can run ElmapiCMS before configuration.</p>

    <ul class="check-list">
        @foreach ($checks as $check)
            <li class="{{ $check['ok'] ? 'ok' : 'bad' }}">
                <span class="status" aria-hidden="true">{{ $check['ok'] ? '✓' : '!' }}</span>
                <span class="label">{{ $check['label'] }}</span>
                <span class="detail">{{ $check['detail'] }}</span>
            </li>
        @endforeach
    </ul>

    @if ($basePath)
        <p class="meta">Application path: <code>{{ $basePath }}</code></p>
    @endif

    <div class="actions">
        @if ($passed)
            <a class="btn btn-primary" href="{{ route('install.configure') }}">Continue</a>
        @else
            <a class="btn btn-secondary" href="{{ route('install.requirements') }}">Recheck</a>
            <button class="btn btn-primary" type="button" disabled>Fix the issues above to continue</button>
        @endif
    </div>
@endsection
