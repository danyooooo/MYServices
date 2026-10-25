import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import LiveRadio from '../views/LiveRadio.vue';
import LiveTV from '../views/LiveTV.vue';
import EPG from '../views/EPG.vue';
import Player from '../views/Player.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/radio', name: 'LiveRadio', component: LiveRadio },
  { path: '/tv', name: 'LiveTV', component: LiveTV },
  { path: '/epg', name: 'EPG', component: EPG },
  { path: '/player', name: 'Player', component: Player, props: route => ({ url: route.query.url }) },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
