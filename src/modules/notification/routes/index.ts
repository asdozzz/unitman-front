import SpisokUvedomleniy from "@/modules/notification/view/SpisokUvedomleniy.vue";

export default [
  {
    path: "/notifications",
    component: SpisokUvedomleniy,
    name: "notifications_list",
    meta: {
      titleKey: "app.titles.notifications",
    },
  },
];
