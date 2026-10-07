<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Version Retention
    |--------------------------------------------------------------------------
    |
    | Maximum number of immutable versions kept per content entry. Set to -1
    | for unlimited history. A positive integer caps the number of versions
    | retained — oldest versions are pruned after each publish.
    |
    */

    'versions_per_entry' => (int) env('CONTENT_VERSIONS_PER_ENTRY', -1),

];
