import dayjs from "dayjs";
import {fromUnixTime} from "date-fns";
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export function convertDate(unixtime: number | null): string {
    if (!unixtime) return '';
    return dayjs(fromUnixTime(unixtime)).fromNow();
}
