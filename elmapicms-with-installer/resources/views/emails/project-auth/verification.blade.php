<x-mail::message>
# {{ $heading }}

{{ $intro }}

<x-mail::button :url="$verificationUrl">
{{ $button_text }}
</x-mail::button>

{{ $outro }}

Thanks,<br>
{{ $project->name ?: config('app.name') }}
</x-mail::message>
