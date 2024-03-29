<template>
    <div>
        <v-navigation-drawer
            v-model="drawerSwitch"
            width="100%"
            :permanent="$vuetify.breakpoint.lgAndUp"
            :absolute="$vuetify.breakpoint.mdAndDown"
            floating
            right
        >
            <v-list>
                <v-list-item-group>
                    <v-list-item
                        link
                        @click="eventsByName('', '', '')"
                        class="mt-n2"
                        :class="getSelectedParticipant.name === '' || !getSelectedParticipant.name ? 'blue' : 'white'">
                        <v-list-item-title :class="getSelectedParticipant.name === '' || !getSelectedParticipant.name? 'white--text' : ''">
                            <span class="mr-2">All</span>
                        </v-list-item-title>
                    </v-list-item>
                </v-list-item-group>

                <!-- Updated v-list-group for volunteers -->
                <v-list-group :value="expandedGroup === 'volunteers' && namesVolunteers.length > 0" @input="handleGroupToggle('volunteers')" dense class="grey lighten-4">
                    <template v-slot:activator>
                        <v-list-item-title
                            ><span class="mr-3">Volunteers</span>
                            <span class="caption grey--text">{{ namesVolunteers.length }}</span>
                        </v-list-item-title>
                    </template>
                    <v-virtual-scroll
                        :items="namesVolunteers"
                        :item-height="40"
                        :height="volunteersScrollHeight"
                    >
                        <template v-slot:default="{ item }">
                            <v-list-item
                                link
                                dense
                                @click="eventsByName(item, 'volunteerNames')"
                                :class="item === getSelectedParticipant.name && 'volunteerNames' === getSelectedParticipant.type ? 'blue' : ''">
                                <v-list-item-title :class="item === getSelectedParticipant.name && 'volunteerNames' === getSelectedParticipant.type ? 'white--text' : ''">
                                    {{ item }}
                                </v-list-item-title>
                            </v-list-item>
                        </template>
                    </v-virtual-scroll>
                </v-list-group>

                <!-- Updated v-list-group for Driver / Driver Helper -->
                <v-list-group :value="expandedGroup === 'driverHelpers' && namesDriverHelpers.length > 0" @input="handleGroupToggle('driverHelpers')" class="grey lighten-4">
                    <template v-slot:activator>
                        <v-list-item-title>
                            <span class="mr-3">Drivers / Driver Helpers</span>
                            <span class="caption grey--text">{{ namesDriverHelpers.length }}</span>
                        </v-list-item-title>
                    </template>
                    <v-virtual-scroll
                        :items="namesDriverHelpers"
                        :item-height="40"
                        :height="driverHelpersScrollHeight"
                    >
                        <template v-slot:default="{ item }">
                            <v-list-item
                                link
                                dense
                                @click="eventsByName(item, 'driverHelperNames')"
                                :class="item === getSelectedParticipant.name && 'driverHelperNames' === getSelectedParticipant.type ? 'blue' : ''">
                                <v-list-item-title :class="item === getSelectedParticipant.name && 'driverHelperNames' === getSelectedParticipant.type ? 'white--text' : ''">
                                    {{ item }}
                                </v-list-item-title>
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
            expandedGroup: 'volunteers',
        };
    },
    watch: {},
    computed: {
        ...mapGetters(["drawerStatus"]),
        ...mapGetters("storeCalendar", [
            "getSelectedParticipant",
            "getNamesVolunteers",
            "getNamesDriverHelpers",
        ]),
        drawerSwitch: {
            get: function () {
                return this.drawerStatus;
            },
            set: function () {},
        },



        namesVolunteers: {
            get: function () {
                return [...this.getNamesVolunteers]
                    .filter((item) => item !== "")
                    .map((event) => event)
                    .sort((a, b) => {
                        return a.split(" ")[1].localeCompare(b.split(" ")[1]);
                    });
            },
        },
        namesDriverHelpers: {
            get: function () {
                return [...this.getNamesDriverHelpers]
                    .filter((item) => item !== "")
                    .map((event) => event)
                    .sort((a, b) => {
                        return a.split(" ")[1].localeCompare(b.split(" ")[1]);
                    });
            },
        },



        volunteersScrollHeight() {
            const itemHeight = 40; // Height of each item
            const maxHeight = 220; // Maximum height
            const calculatedHeight = this.namesVolunteers.length * itemHeight;
            return Math.min(calculatedHeight, maxHeight) + 'px'; // Return the smaller of calculatedHeight or maxHeight
        },
        driverHelpersScrollHeight() {
            const itemHeight = 40; // Height of each item
            const maxHeight = 220; // Maximum height
            const calculatedHeight = this.namesDriverHelpers.length * itemHeight;
            return Math.min(calculatedHeight, maxHeight) + 'px'; // Return the smaller of calculatedHeight or maxHeight
        }
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["updateSelectedParticipant"]),
        ...mapMutations(["drawerChange"]),




        async eventsByName(name, type) {
            try {
                await this.updateSelectedParticipant({ name, type });
                this.$emit("selectedParticipant");
                this.drawerChange();
            } catch (error) {
                console.error("[CalendarSideBar/eventsByName]: Error updating selected participant.", error);
            }
        },




        handleGroupToggle(groupName) {
            const hasItems = groupName === 'volunteers' ? this.namesVolunteers.length > 0 : this.namesDriverHelpers.length > 0;
            if (!hasItems) {
                return;
            }
            this.expandedGroup = this.expandedGroup === groupName ? '' : groupName;
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