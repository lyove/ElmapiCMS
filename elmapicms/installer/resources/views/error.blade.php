@extends('installer::layout')

@section('title', 'Error')

@section('content')
    <h1>Something went wrong</h1>
    <p class="lede">The installation could not be completed.</p>

    <div class="alert alert-danger">{{ $message }}</div>

    @if (! empty($log))
        <ul class="log">
            @foreach ($log as $line)
                <li>{{ $line }}</li>
            @endforeach
        </ul>
    @endif

    <div class="actions">
        <a class="btn btn-secondary" href="{{ route('install.requirements') }}">Back to requirements</a>
        <a class="btn btn-primary" href="{{ route('install.configure') }}">Back to configuration</a>
    </div>
@endsection
