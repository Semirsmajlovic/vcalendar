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
                        @click="eventsByName('', '')"
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

        // ===================================================================================== //
        // Computed - Automatically recalculate when their dependencies change

        drawerSwitch: {
            get: function () {
                return this.drawerStatus;
            },
            set: function () {},
        },

        // ===================================================================================== //
        // Computed - Automatically recalculate when their dependencies change

        namesVolunteers: {
            get() {
                return this.getNamesVolunteers
                    .filter(item => item !== "")
                    .sort((a, b) => a.split(" ")[1].localeCompare(b.split(" ")[1]));
            },
        },

        // ===================================================================================== //
        // Computed - Automatically recalculate when their dependencies change

        namesDriverHelpers: {
            get() {
                return this.getNamesDriverHelpers
                    .filter(item => item !== "")
                    .sort((a, b) => a.split(" ")[1].localeCompare(b.split(" ")[1]));
            },
        },

        // ===================================================================================== //
        // Computed - Automatically recalculate when their dependencies change

        volunteersScrollHeight() {
            const itemHeight = 40; // Height of each item
            const maxHeight = 220; // Maximum height
            const calculatedHeight = this.namesVolunteers.length * itemHeight;
            return `${Math.min(calculatedHeight, maxHeight)}px`; // Use template literals for cleaner concatenation
        },

        // ===================================================================================== //
        // Computed - Automatically recalculate when their dependencies change

        driverHelpersScrollHeight() {
            const itemHeight = 40; // Height of each item
            const maxHeight = 220; // Maximum height
            const calculatedHeight = this.namesDriverHelpers.length * itemHeight;
            return `${Math.min(calculatedHeight, maxHeight)}px`; // Use template literals for cleaner concatenation
        }
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["updateSelectedParticipant"]),
        ...mapMutations(["drawerChange"]),

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        async eventsByName(name, type) {
            try {
                await this.updateSelectedParticipant({ name, type });
                this.$emit("selectedParticipant");
                this.drawerChange();
            } catch (error) {
                this.logError(error, "[CalendarSideBar/eventsByName]: Error updating selected participant.");
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        handleGroupToggle(groupName) {
            const hasItems = groupName === 'volunteers' ? this.namesVolunteers.length > 0 : this.namesDriverHelpers.length > 0;
            if (!hasItems) return;
            this.expandedGroup = this.expandedGroup === groupName ? '' : groupName;
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        checkDuplicateName(name, type) {
            return this[type] && this[type].includes(name);
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        clearItems() {
            this.items = [];
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        logError(error, message) {
            console.error(message, error);
            this.updateSnackMessage(`Error: ${error.message}`);
        },
    },
};
</script>