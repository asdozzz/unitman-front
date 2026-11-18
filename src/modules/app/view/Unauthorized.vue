<template>
  <div class="app-page flex flex-center">
    <q-card class="app-state-card q-pa-md">
      <q-card-section class="text-center">
        <q-icon name="lock" size="56px" color="warning" />
        <div class="text-h6 q-mt-sm">{{ $t('app.unauthorized.caption') }}</div>
        <p class="text-caption-muted q-mt-sm q-mb-none">
          {{ $t('app.unauthorized.description') }}
        </p>
      </q-card-section>

      <q-card-actions align="center">
        <q-btn
            color="primary"
            :label="$t('app.unauthorized.home')"
            to="/"
            no-caps
        />
        <q-btn
            flat
            color="primary"
            :label="$t('app.unauthorized.units')"
            to="/unit/list"
            no-caps
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<style scoped>
.app-state-card {
  width: 100%;
  max-width: 520px;
}

.app-page {
  min-height: 60vh;
}
</style>
