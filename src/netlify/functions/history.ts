// GET /metrics - returns public Hubble stats
import {Handler} from "@netlify/functions";
import {ok} from "../../utils/apiUtils";
import {TimestampValueResponse} from "../../models/api/TimestampValueResponse";

export type HistoryResponse = {
    // Number of borrowers through history
    borrowersHistory: TimestampValueResponse[];
    // HBB price through history
    hbbPriceHistory: TimestampValueResponse[];
    // Number of HBB holders through history
    hbbHoldersHistory: TimestampValueResponse[];
    // Number of loans through history
    loansHistory: TimestampValueResponse[];
    // Total USDH issued through history
    usdhHistory: TimestampValueResponse[];
}

const getMockHistory = (start: Date, end: Date): TimestampValueResponse[] => {
    const history: TimestampValueResponse[] = [];
    for (const dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        history.push({ epoch: dt.valueOf(), value: Math.random() * 1000 });
    }
    return history;
};

const getMockResponse = () : HistoryResponse => {
  return {
      hbbHoldersHistory: getMockHistory(new Date('2020-01-01'), new Date('2020-01-02')),
      hbbPriceHistory: getMockHistory(new Date('2020-01-01'), new Date('2020-01-02')),
      loansHistory: getMockHistory(new Date('2020-01-01'), new Date('2020-01-02')),
      usdhHistory: getMockHistory(new Date('2020-01-01'), new Date('2020-01-02')),
      borrowersHistory: getMockHistory(new Date('2020-01-01'), new Date('2020-01-02')),
  }
}

// GET /history of Hubble stats
export const handler: Handler = async (event, context) => {
    const response = getMockResponse();
    return ok(response);
}