<template>
    <div>
        <v-navigation-drawer
            v-model="drawerSwitch"
            :permanent="$vuetify.breakpoint.lgAndUp"
            :absolute="$vuetify.breakpoint.mdAndDown"
            floating
            right
        >
            <v-list>
                <v-list-item-group>
                    <v-list-item
                        link
                        @click="eventsByName('', '')"
                        class="mt-n2"
                        :class="
                            getSelectedPerson.name === '' ||
                            !getSelectedPerson.name
                                ? 'blue'
                                : 'white'
                        "
                    >
                        <v-list-item-title
                            :class="
                                getSelectedPerson.name === '' ||
                                !getSelectedPerson.name
                                    ? 'white--text'
                                    : ''
                            "
                            ><span class="mr-2">All</span></v-list-item-title
                        >
                    </v-list-item>
                </v-list-item-group>

                <!-- Updated v-list-group for Caregivers -->
                <v-list-group :value="namesCaregivers.length > 0" dense>
                    <template v-slot:activator>
                        <v-list-item-title
                            ><span class="mr-3">Caregivers</span>
                            <span class="caption grey--text">{{ namesCaregivers.length }}</span></v-list-item-title
                        >
                    </template>
                    <v-virtual-scroll
                        :items="namesCaregivers"
                        :item-height="40"
                        height="220"
                    >
                        <template v-slot:default="{ item }">
                            <v-list-item
                                link
                                dense
                                @click="eventsByName(item, 'caregiver')"
                                :class="
                                    item === getSelectedPerson.name
                                        ? 'blue'
                                        : ''
                                "
                            >
                                <v-list-item-title
                                    :class="
                                        item === getSelectedPerson.name
                                            ? 'white--text'
                                            : ''
                                    "
                                    >{{ item }}</v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                </v-list-group>

                <!-- Updated v-list-group for Clients -->
                <v-list-group :value="namesClients.length > 0">
                    <template v-slot:activator>
                        <v-list-item-title
                            ><span class="mr-3">Clients</span>
                            <span class="caption grey--text">{{ namesClients.length }}</span></v-list-item-title
                        >
                    </template>
                    <v-virtual-scroll
                        :items="namesClients"
                        :item-height="40"
                        height="220"
                    >
                        <template v-slot:default="{ item }">
                            <v-list-item
                                link
                                dense
                                @click="eventsByName(item, 'client')"
                                :class="
                                    item === getSelectedPerson.name
                                        ? 'blue'
                                        : ''
                                "
                            >
                                <v-list-item-title
                                    :class="
                                        item === getSelectedPerson.name
                                            ? 'white--text'
                                            : ''
                                    "
                                    >{{ item }}</v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                </v-list-group>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from "vuex";
export default {
    name: "CalendarSideBar",
    props: {
        focus: {
            type: String,
            default: "",
        },
    },
    data() {
        return {
            valid: false,
            loading: false,
            items: [],
            rulesName: [
                (value) =>
                    !value ||
                    /^[a-zA-Z&-]+\s{1}[a-zA-Z-]+$/.test(value) ||
                    "Names must be 2 words separated by space",
                (value) => !!value || "Required",
            ],
        };
    },
    watch: {},
    computed: {
        ...mapGetters(["drawerStatus"]),
        ...mapGetters("storeCalendar", [
            "getSelectedPerson",
            "getNamesCaregivers",
            "getNamesClients",
        ]),
        drawerSwitch: {
            get: function () {
                return this.drawerStatus;
            },
            set: function () {},
        },
        namesCaregivers: {
            get: function () {
                return [...this.getNamesCaregivers]
                    .filter((item) => item !== "")
                    .map((event) => event)
                    .sort((a, b) => {
                        return a.split(" ")[1].localeCompare(b.split(" ")[1]);
                    });
            },
        },
        namesClients: {
            get: function () {
                return [...this.getNamesClients]
                    .filter((item) => item !== "")
                    .map((event) => event)
                    .sort((a, b) => {
                        return a.split(" ")[1].localeCompare(b.split(" ")[1]);
                    });
            },
        },
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["updateSelectedPerson"]),
        ...mapMutations(["drawerChange"]),
        ...mapMutations("storeCalendar", ["ADD_NEW_TEMPORARY_PERSON"]),
        async eventsByName(name, type) {
            await this.updateSelectedPerson({ name, type });
            this.$emit("selectedPerson");
            this.drawerChange();
        },
        checkDuplicateName(name, type) {
            return this[type].includes(name);
        },
        clearItems() {
            this.items = [];
        },
    },
};
</script>

<style scoped>
</style>