@extends('installer::layout')

@section('title', 'Configuration')

@section('content')
    <ul class="steps">
        <li class="is-done">1. Welcome</li>
        <li class="is-done">2. Requirements</li>
        <li class="is-active">3. Configuration</li>
        <li>4. Install</li>
        <li>5. Done</li>
    </ul>

    <h1>Configuration</h1>
    <p class="lede">Enter your site URL, MySQL credentials, and the first admin account.</p>

    @if (! empty($errors))
        <div class="alert alert-danger">
            Fix the highlighted fields, then try again.
            @if (! empty($errors['db']))
                <div style="margin-top:0.5rem">{{ $errors['db'] }}</div>
            @endif
        </div>
    @endif

    <form method="post" action="{{ route('install.configure.save') }}" autocomplete="off">
        @csrf

        <fieldset>
            <legend>Site</legend>
            <div class="form-grid">
                <div>
                    <label for="app_url">Site URL</label>
                    <input id="app_url" name="app_url" type="url" required
                           value="{{ old('app_url', $old['app_url'] ?? '') }}"
                           placeholder="https://example.com">
                    @if (! empty($errors['app_url']))
                        <div class="field-error">{{ $errors['app_url'] }}</div>
                    @endif
                </div>
            </div>
        </fieldset>

        <fieldset>
            <legend>Database</legend>
            <div class="form-grid two">
                <div>
                    <label for="db_host">Host</label>
                    <input id="db_host" name="db_host" type="text" required
                           value="{{ old('db_host', $old['db_host'] ?? 'localhost') }}"
                           placeholder="localhost">
                    @if (! empty($errors['db_host']))
                        <div class="field-error">{{ $errors['db_host'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="db_port">Port</label>
                    <input id="db_port" name="db_port" type="text" required
                           value="{{ old('db_port', $old['db_port'] ?? '3306') }}"
                           placeholder="3306">
                    @if (! empty($errors['db_port']))
                        <div class="field-error">{{ $errors['db_port'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="db_database">Database name</label>
                    <input id="db_database" name="db_database" type="text" required
                           value="{{ old('db_database', $old['db_database'] ?? '') }}"
                           placeholder="my_database">
                    @if (! empty($errors['db_database']))
                        <div class="field-error">{{ $errors['db_database'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="db_username">Username</label>
                    <input id="db_username" name="db_username" type="text" required
                           value="{{ old('db_username', $old['db_username'] ?? '') }}"
                           placeholder="db_user">
                    @if (! empty($errors['db_username']))
                        <div class="field-error">{{ $errors['db_username'] }}</div>
                    @endif
                </div>
                <div style="grid-column: 1 / -1">
                    <label for="db_password">Password</label>
                    <input id="db_password" name="db_password" type="password"
                           value="{{ old('db_password', $old['db_password'] ?? '') }}"
                           placeholder="Database password">
                </div>
            </div>
        </fieldset>

        <fieldset>
            <legend>Admin account</legend>
            <div class="form-grid two">
                <div>
                    <label for="admin_name">Name</label>
                    <input id="admin_name" name="admin_name" type="text" required
                           value="{{ old('admin_name', $old['admin_name'] ?? 'Admin') }}"
                           placeholder="Your name">
                    @if (! empty($errors['admin_name']))
                        <div class="field-error">{{ $errors['admin_name'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="admin_email">Email</label>
                    <input id="admin_email" name="admin_email" type="email" required
                           value="{{ old('admin_email', $old['admin_email'] ?? '') }}"
                           placeholder="admin@example.com">
                    @if (! empty($errors['admin_email']))
                        <div class="field-error">{{ $errors['admin_email'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="admin_password">Password</label>
                    <input id="admin_password" name="admin_password" type="password" required minlength="8"
                           value=""
                           placeholder="At least 8 characters">
                    @if (! empty($errors['admin_password']))
                        <div class="field-error">{{ $errors['admin_password'] }}</div>
                    @endif
                </div>
                <div>
                    <label for="admin_password_confirmation">Confirm password</label>
                    <input id="admin_password_confirmation" name="admin_password_confirmation" type="password" required minlength="8"
                           value=""
                           placeholder="Repeat your password">
                    @if (! empty($errors['admin_password_confirmation']))
                        <div class="field-error">{{ $errors['admin_password_confirmation'] }}</div>
                    @endif
                </div>
            </div>
        </fieldset>

        <div class="actions">
            <a class="btn btn-secondary" href="{{ route('install.requirements') }}">Back</a>
            <button class="btn btn-primary" type="submit">Save &amp; continue</button>
        </div>
    </form>
@endsection
