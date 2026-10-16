<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class ProjectLocaleService
{
    /**
     * Add a locale code to the project if it is not already present.
     *
     * @throws ValidationException
     */
    public function addLocale(Project $project, string $locale): Project
    {
        $locale = strtolower(trim($locale));
        if ($locale === '') {
            throw ValidationException::withMessages([
                'locale' => ['Locale cannot be empty'],
            ]);
        }

        $locales = $this->normalizedLocales($project);
        if (in_array($locale, $locales, true)) {
            throw ValidationException::withMessages([
                'locale' => ['Locale already exists'],
            ]);
        }

        $locales[] = $locale;
        $project->locales = $locales;
        $project->save();

        return $project->fresh();
    }

    /**
     * Remove a locale from the project (cannot remove the default locale).
     *
     * @throws ValidationException
     */
    public function removeLocale(Project $project, string $locale): Project
    {
        $locale = strtolower(trim($locale));
        if ($locale === $project->default_locale) {
            throw ValidationException::withMessages([
                'locale' => ['Cannot delete default locale'],
            ]);
        }

        $before = $this->normalizedLocales($project);
        $after = array_values(array_filter($before, fn ($l) => $l !== $locale));

        if (count($after) === count($before)) {
            return $project->fresh();
        }

        $project->locales = $after;
        $project->save();

        return $project->fresh();
    }

    /**
     * Set the default locale; adds the locale to the list if missing.
     *
     * @throws ValidationException
     */
    public function setDefaultLocale(Project $project, string $locale): Project
    {
        $locale = strtolower(trim($locale));
        if ($locale === '') {
            throw ValidationException::withMessages([
                'locale' => ['Locale cannot be empty'],
            ]);
        }

        $locales = $this->normalizedLocales($project);
        if (! in_array($locale, $locales, true)) {
            $locales[] = $locale;
        }

        $project->locales = $locales;
        $project->default_locale = $locale;
        $project->save();

        return $project->fresh();
    }

    /**
     * @return list<string>
     */
    private function normalizedLocales(Project $project): array
    {
        return collect(Arr::wrap($project->locales))
            ->map(fn ($value) => strtolower(trim((string) $value)))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();
    }
}
