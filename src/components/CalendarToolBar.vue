<template>
    <v-sheet height="64">
        <v-toolbar flat color="white">
            <v-container>
                <v-row no-gutters>
                    <v-col cols="12" md="6" lg="4">
                        <v-toolbar-title v-if="reference">
                            <span class="title--text text-left">{{
                                reference.title
                            }}</span>
                            <span class="title--text blue--text ml-2">
                                {{ getSelectedPerson.name || "All" }}
                            </span>
                        </v-toolbar-title>
                    </v-col>
                    <v-col
                        cols="12"
                        md="6"
                        lg="4"
                        align-self="center"
                        :class="
                            $vuetify.breakpoint.lgAndUp ? 'text-center' : ''
                        "
                    >
                        <span>
                            <span class="body mr-1"> {{ totalHours }}</span>
                            <span class="body mr-3 button">hrs</span>
                            <span class="body mr-1"> {{ events.length }}</span>
                            <span class="body mr-4 button">events</span>
                        </span>
                        <v-btn
                            text
                            color="blue darken-1"
                            @click="PDFCalendar(getSelectedPerson.name, focus)"
                        >
                            <v-icon> mdi-file-pdf-outline </v-icon>PDF
                        </v-btn>
                    </v-col>

                    <v-col
                        cols="12"
                        md="12"
                        lg="4"
                        :class="$vuetify.breakpoint.lgAndUp ? 'text-right' : ''"
                    >
                        <v-menu bottom left>
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    outlined
                                    color="grey darken-1"
                                    v-bind="(attrs, buttonSize)"
                                    v-on="on"
                                    class="mr-4"
                                >
                                    <span>{{ typeToLabel[propType] }}</span>
                                    <v-icon right>mdi-menu-down</v-icon>
                                </v-btn>
                            </template>
                            <v-list>
                                <v-list-item @click="$emit('typeMonth')">
                                    <v-list-item-title>Month</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="$emit('typeWeek')">
                                    <v-list-item-title>Week</v-list-item-title>
                                </v-list-item>
                                <v-list-item @click="$emit('type4day')">
                                    <v-list-item-title
                                        >4 days</v-list-item-title
                                    >
                                </v-list-item>
                                <v-list-item @click="$emit('typeDay')">
                                    <v-list-item-title>Day</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>

                        <v-btn
                            v-bind="buttonSize"
                            outlined
                            class="mr-4"
                            color="grey darken-1"
                            @click="$emit('todayButtonClick')"
                        >
                            Today
                        </v-btn>
                        <v-btn
                            v-bind="buttonSize"
                            outlined
                            color="grey darken-1"
                            @click="prev"
                            class="mr-4"
                        >
                            <v-icon small>mdi-chevron-left</v-icon>
                        </v-btn>
                        <v-btn
                            v-bind="buttonSize"
                            outlined
                            color="grey darken-1"
                            @click="next"
                        >
                            <v-icon small>mdi-chevron-right</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-container>

            <!-- <v-spacer></v-spacer> -->
        </v-toolbar>
    </v-sheet>
</template>

<script>
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { mapGetters } from "vuex";
export default {
    components: {},
    data() {
        return {
            typeToLabel: {
                month: "Month",
                week: "Week",
                day: "Day",
                "4day": "4 Days",
            },
        };
    },
    props: {
        events: {
            type: Array,
            default() {
                return [];
            },
        },
        focus: {
            type: String,
            default: "",
        },
        propType: {
            type: String,
            default: "",
        },
        reference: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    computed: {
        ...mapGetters("storeCalendar", ["getSelectedPerson"]),
        totalHours: {
            get: function () {
                if (!this.events.length) {
                    return;
                }

                return this.events.reduce(
                    (sum, { duration }) => sum + parseFloat(duration),
                    0
                );
            },
        },
        buttonSize() {
            const size = {
                xs: "x-small",
                sm: "small",
                md: "small",
                lg: "small",
                xl: "large",
            }[this.$vuetify.breakpoint.name];
            return size ? { [size]: true } : {};
        },
    },
    methods: {
        prev() {
            this.reference.prev();
        },
        next() {
            this.reference.next();
        },
        PDFCalendar(name, focus) {
            // To save the calendar in PDF with the person's name / date above it without changing the actual view of the calendar, use couple tricks. Clone the calendar view, move this out of the screen using css left: -10000px, append the name / date above it then ready it for jsPDF to do it's job.

            // Find the calendar area and clone it
            let target = document.querySelector("#calendarContent");
            let clone = target.cloneNode(true);
            clone.id = "printCalendarClone";
            target.after(clone);

            // Create the information area that houses the name and date
            let newContent = document.createElement("h3");
            newContent.style.paddingTop = "1rem";
            newContent.style.paddingBottom = "1rem";

            let personName = name === undefined ? "All" : name;
            let date =
                !focus || focus === ""
                    ? `${new Date().getFullYear()}-${new Date().getMonth() + 1}`
                    : focus.substr(0, 7);

            newContent.innerHTML = `${personName} ${date}`;

            // Attach the information area to cloned calendar
            let newTarget = document
                .querySelector("#printCalendarClone")
                .getElementsByClassName("printInformationArea")[0];
            newTarget.appendChild(newContent);

            // Create PDF
            const pdf = new jsPDF({
                orientation: "portrait",
                format: [470, 500],
            });
            let element = document.querySelector("#printCalendarClone");
            let width = element.style.width;
            let height = element.style.height;
            html2canvas(element)
                .then((canvas) => {
                    let image = canvas.toDataURL("image/png");
                    pdf.addImage(image, "JPEG", 20, 20, width, height);
                    pdf.save(`${personName}-${date}.pdf`);
                })
                .catch(function (e) {
                    this.updateSnackMessage(`Error at html2canvas : ${e} `);
                });
        },
    },
};
</script>

<style lang="scss">
// Move cloned calendar outside of view so that the user does not see it
#printCalendarClone {
    position: fixed;
    left: -10000px;
    padding: 1rem;
}
</style>
