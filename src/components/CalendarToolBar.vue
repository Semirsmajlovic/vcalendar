<template>
    <v-sheet height="64">
        <v-toolbar flat>
            <v-row align="center" justify="space-between" no-gutters>

                <!-- Left Column for Buttons -->
                <v-col cols="3">
                    <!-- Month Button -->
                    <v-menu bottom left>
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn outlined color="grey darken-2" v-bind="attrs" v-on="on">
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
                                <v-list-item-title>4 days</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="$emit('typeDay')">
                                <v-list-item-title>Day</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <!-- Today Button -->
                    <v-btn outlined class="mx-2" color="grey darken-2" @click="$emit('todayButtonClick')">
                        Today
                    </v-btn>

                    <!-- Previous Button -->
                    <v-btn
                        outlined
                        color="grey darken-2"
                        @click="prev"
                        class="mr-2"
                    >
                        <v-icon small>mdi-chevron-left</v-icon>
                    </v-btn>

                    <!-- Next Button -->
                    <v-btn
                        outlined
                        color="grey darken-2"
                        @click="next"
                    >
                        <v-icon small>mdi-chevron-right</v-icon>
                    </v-btn>

                    <v-tooltip bottom>
                        <template v-slot:activator="{ on, attrs }">
                            <v-icon v-bind="attrs" v-on="on" class="ml-2" color="red">mdi-help-circle</v-icon>
                        </template>
                        <span v-html="tooltipToolbarContent"></span>
                    </v-tooltip>

                </v-col>

                <!-- Center Column for Toolbar Title -->
                <v-col cols="4" class="d-flex justify-center align-center">
                    <v-toolbar-title v-if="reference" class="d-flex align-center justify-center">
                        <span>{{ reference.title }}</span>
                        <span v-if="isLoggedIn" class="ml-2">
                            | Selected: <span class="blue--text">{{ getSelectedParticipant.name || "All" }}</span>
                        </span>
                    </v-toolbar-title>
                </v-col>

                <!-- Right Column for Chips -->
                <v-col cols="5" md="5" class="text-right">
                    <v-chip color="blue darken-1" label text-color="white">
                        <v-icon left>mdi-clock-outline</v-icon>
                        Total Hours: {{ totalHours }}
                    </v-chip>
                    <v-chip class="ma-2" color="blue darken-1" label text-color="white">
                        <v-icon left>mdi-calendar-range</v-icon>
                        Total Shifts: {{ shifts.length }}
                    </v-chip>
                    <v-chip v-if="isLoggedIn" class="mr-2" color="blue darken-1" label text-color="white" @click="PDFCalendar(getSelectedParticipant.name, focus)">
                        <v-icon left>mdi-download</v-icon>
                        Download Calendar
                    </v-chip>
                    <v-chip v-if="isLoggedIn" class="mr-0" color="blue darken-1" label text-color="white">
                        <a href="https://firebasestorage.googleapis.com/v0/b/volunteer-portal-hstl-3ef78.appspot.com/o/admin-tutorial.pdf?alt=media&token=e841efca-1bdf-46ed-9bd8-685c8b2e1315" download="LoggedInUserGuide.pdf" target="_blank" style="color: white; text-decoration: none;">
                            <v-icon left>mdi-download</v-icon>
                            Admin Guide
                        </a>
                    </v-chip>
                    <v-chip v-else class="mr-0" color="blue darken-1" label text-color="white">
                        <a href="https://firebasestorage.googleapis.com/v0/b/volunteer-portal-hstl-3ef78.appspot.com/o/user-guide.pdf?alt=media&token=9c7946a2-7e99-42a5-a528-29521315b99f" download="DefaultUserGuide.pdf" target="_blank" style="color: white; text-decoration: none;">
                            <v-icon left>mdi-download</v-icon>
                            User Guide
                        </a>
                    </v-chip>
                </v-col>

            </v-row>
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
                day: "Day", "4day": "4 Days",
            },
        };
    },
    props: {
        shifts: {
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
        ...mapGetters("storeCalendar", ["getSelectedParticipant"]),
        isLoggedIn() {
            return !!this.$store.state.user;
        },
        totalHours: {
            get: function () {
                try {
                    if (!this.shifts.length) {
                        return 0;
                    }
                    const total = this.shifts.reduce((sum, shift) => {
                        const duration = parseFloat(shift.duration);
                        if (isNaN(duration)) {
                            return sum;
                        }
                        return sum + duration;
                    }, 0);
                    return total;
                } catch (error) {
                    return 0; // Return 0 in case of any error
                }
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
        tooltipToolbarContent() {
            if (this.isLoggedIn) {
                return `
                    <div>Admin side</div>
                    <div>Contact support</div>
                    <div>Another entry</div>
                `;
            } else {
                return `
                    <div>Volunteer side</div>
                    <div>Contact support</div>
                    <div>Another entry</div>
                `;
            }
        }
    },
    methods: {
        prev() {
            this.reference.prev();
        },
        next() {
            this.reference.next();
        },
        PDFCalendar(name, focus) {
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
            let year = new Date().getFullYear();
            let month = new Date().getMonth() + 1; // Get the current month (1-12)
            let options = { year: 'numeric', month: 'long' };

            // Create a date for the first day of the given month to avoid any end-of-month confusion
            let readableDate = new Date(year, month - 1, 1); // Adjust month -1 because JavaScript months are 0-based
            let formattedDate = readableDate.toLocaleDateString('en-US', options);

            // Update the innerHTML to use the new format
            newContent.innerHTML = `Selected: ${personName} - Date: ${formattedDate}`;

            let newTarget = document.querySelector("#printCalendarClone").getElementsByClassName("printInformationArea")[0];
            if (!newTarget) {
                newTarget = document.createElement("div");
                newTarget.className = "printInformationArea";
                clone.insertBefore(newTarget, clone.firstChild);
            }
            newTarget.appendChild(newContent);

            // Adjust clone styles for PDF rendering
            clone.style.width = "auto";
            clone.style.height = "auto";

            // Create PDF in landscape orientation
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "pt",
                format: "a4",
            });

            html2canvas(clone, { scale: 2, useCORS: true }).then((canvas) => {
                const contentWidth = canvas.width;
                const contentHeight = canvas.height;

                // Calculate the width and height ratio to fit the PDF page
                const pdfPageWidth = pdf.internal.pageSize.getWidth();
                const pdfPageHeight = pdf.internal.pageSize.getHeight();
                const widthRatio = pdfPageWidth / contentWidth;
                const heightRatio = pdfPageHeight / contentHeight;
                const scaleRatio = Math.min(widthRatio, heightRatio);

                const imageWidth = contentWidth * scaleRatio;
                const imageHeight = contentHeight * scaleRatio;

                let image = canvas.toDataURL("image/png");
                pdf.addImage(image, "PNG", 0, 0, imageWidth, imageHeight);
                pdf.save(`${personName}-${formattedDate}.pdf`);
            }).catch(function (e) {
                console.error(`Error at html2canvas: ${e}`);
            }).finally(() => {
                // Remove the cloned calendar after PDF generation
                clone.remove();
            });
        },
    },
};
</script>

<style lang="scss" scoped>
// Move cloned calendar outside of view so that the user does not see it
#printCalendarClone {
    position: fixed;
    left: -10000px;
    padding: 1rem;
}
::v-deep .v-toolbar__content {
  padding: 0 !important;
}
</style>
