@extends('installer::layout')

@section('title', 'Already installed')

@section('content')
    <h1>Already installed</h1>
    <p class="lede">
        This copy of ElmapiCMS is already installed
        @if ($basePath)
            (<code>{{ $basePath.'/storage/app/installed' }}</code>).
        @else
            .
        @endif
        The installer will not run again.
    </p>

    <div class="alert alert-warn">
        Every <code>/install</code> route is locked. To reinstall, delete
        <code>storage/app/installed</code> — after removing your existing data.
    </div>

    <div class="actions">
        <a class="btn btn-secondary" href="{{ rtrim($appUrl, '/').'/login' }}">Go to login</a>
    </div>
@endsection
