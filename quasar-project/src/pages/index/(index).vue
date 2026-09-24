<template>
  <q-page>
    <q-infinite-scroll
      @load="loadMore"
      :offset="250"
    >
      <q-item
        v-for="item in items"
        :key="item"
      >
        <q-item-section>
          Item {{ item }}
        </q-item-section>
      </q-item>
    </q-infinite-scroll>
  </q-page>
</template>

<script setup lang="ts">
// function 
import { ref } from "vue";

const items = ref([1, 2, 3, 4, 5]);

function loadMore(index: number, done: () => void) {
  if (items.value.length >= 30) {
    done();
    return;
  }

  items.value.push(
    items.value.length + 1,
    items.value.length + 2,
    items.value.length + 3,
    items.value.length + 4,
    items.value.length + 5
  );

  done();
}
</script>
